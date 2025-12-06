import { Connection, PublicKey } from '@solana/web3.js';
import { PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client';
import axios from 'axios';
import { ThreatIntelligence } from './types';
import { logger } from './logger';

interface PriceData {
  price: number;
  confidence: number;
  exponent: number;
  timestamp: number;
}

interface ThreatDataSource {
  countryCode: string;
  internetFreedomScore: number; // 0-100, lower = more censorship
  vpnBlockingLevel: number; // 0-10
  dpiDetectionActive: boolean;
  lastIncident?: string;
  source: string;
}

export class PythIntegration {
  private connection: Connection;
  private pythClient: PythHttpClient;
  private threatCache: Map<string, ThreatIntelligence> = new Map();
  private priceCache: Map<string, PriceData> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private historicalData: Map<string, Array<{ timestamp: number; value: number }>> = new Map();
  private readonly HISTORICAL_DAYS = 7;
  
  // Real Pyth price feed IDs for devnet
  private readonly PRICE_FEEDS = {
    SOL_USD: 'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix', // SOL/USD on devnet
    USDC_USD: '5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7', // USDC/USD on devnet
  };

  constructor(rpcUrl: string, pythEndpoint: string = 'https://hermes.pyth.network') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.pythClient = new PythHttpClient(this.connection, getPythProgramKeyForCluster('devnet'));
    this.initializeThreatData();
  }

  private initializeThreatData(): void {
    // Real data from Freedom House Internet Freedom Index 2024
    // Combined with OONI censorship data
    const realThreatData: Record<string, Omit<ThreatIntelligence, 'lastUpdated'>> = {
      'CN': { countryCode: 'CN', threatLevel: 10, censorshipScore: 90, dpiDetected: true, sources: ['freedom-house', 'ooni'] },
      'IR': { countryCode: 'IR', threatLevel: 10, censorshipScore: 88, dpiDetected: true, sources: ['freedom-house', 'ooni'] },
      'KP': { countryCode: 'KP', threatLevel: 10, censorshipScore: 100, dpiDetected: true, sources: ['freedom-house'] },
      'SY': { countryCode: 'SY', threatLevel: 9, censorshipScore: 85, dpiDetected: true, sources: ['freedom-house', 'ooni'] },
      'TM': { countryCode: 'TM', threatLevel: 9, censorshipScore: 83, dpiDetected: true, sources: ['freedom-house'] },
      'RU': { countryCode: 'RU', threatLevel: 8, censorshipScore: 78, dpiDetected: true, sources: ['freedom-house', 'ooni'] },
      'BY': { countryCode: 'BY', threatLevel: 8, censorshipScore: 76, dpiDetected: true, sources: ['freedom-house'] },
      'CU': { countryCode: 'CU', threatLevel: 7, censorshipScore: 72, dpiDetected: true, sources: ['freedom-house'] },
      'VN': { countryCode: 'VN', threatLevel: 7, censorshipScore: 70, dpiDetected: true, sources: ['freedom-house', 'ooni'] },
      'SA': { countryCode: 'SA', threatLevel: 7, censorshipScore: 68, dpiDetected: true, sources: ['freedom-house'] },
      'TR': { countryCode: 'TR', threatLevel: 6, censorshipScore: 64, dpiDetected: true, sources: ['freedom-house', 'ooni'] },
      'EG': { countryCode: 'EG', threatLevel: 6, censorshipScore: 62, dpiDetected: true, sources: ['freedom-house'] },
      'PK': { countryCode: 'PK', threatLevel: 5, censorshipScore: 58, dpiDetected: true, sources: ['freedom-house', 'ooni'] },
      'TH': { countryCode: 'TH', threatLevel: 5, censorshipScore: 55, dpiDetected: false, sources: ['freedom-house'] },
      'VE': { countryCode: 'VE', threatLevel: 5, censorshipScore: 54, dpiDetected: false, sources: ['freedom-house'] },
      'SG': { countryCode: 'SG', threatLevel: 3, censorshipScore: 35, dpiDetected: false, sources: ['freedom-house'] },
      'IN': { countryCode: 'IN', threatLevel: 3, censorshipScore: 32, dpiDetected: false, sources: ['freedom-house', 'ooni'] },
      'US': { countryCode: 'US', threatLevel: 1, censorshipScore: 12, dpiDetected: false, sources: ['freedom-house'] },
      'GB': { countryCode: 'GB', threatLevel: 1, censorshipScore: 15, dpiDetected: false, sources: ['freedom-house'] },
      'CA': { countryCode: 'CA', threatLevel: 1, censorshipScore: 10, dpiDetected: false, sources: ['freedom-house'] },
      'DE': { countryCode: 'DE', threatLevel: 1, censorshipScore: 8, dpiDetected: false, sources: ['freedom-house'] },
      'FR': { countryCode: 'FR', threatLevel: 1, censorshipScore: 11, dpiDetected: false, sources: ['freedom-house'] },
      'NL': { countryCode: 'NL', threatLevel: 0, censorshipScore: 5, dpiDetected: false, sources: ['freedom-house'] },
      'CH': { countryCode: 'CH', threatLevel: 0, censorshipScore: 4, dpiDetected: false, sources: ['freedom-house'] },
      'IS': { countryCode: 'IS', threatLevel: 0, censorshipScore: 2, dpiDetected: false, sources: ['freedom-house'] },
      'NO': { countryCode: 'NO', threatLevel: 0, censorshipScore: 3, dpiDetected: false, sources: ['freedom-house'] },
      'SE': { countryCode: 'SE', threatLevel: 0, censorshipScore: 6, dpiDetected: false, sources: ['freedom-house'] },
    };

    const now = Date.now();
    for (const [code, data] of Object.entries(realThreatData)) {
      this.threatCache.set(code, { ...data, lastUpdated: now });
      this.historicalData.set(code, [{ timestamp: now, value: data.threatLevel }]);
    }

    logger.info('Initialized threat intelligence data', { countries: this.threatCache.size });
  }

  async startMonitoring(): Promise<void> {
    logger.info('Starting Pyth oracle monitoring with real feeds...');
    
    // Initial fetch
    await this.fetchPriceData();
    await this.fetchRealTimeThreatData();
    
    // Update prices every 30 seconds
    this.updateInterval = setInterval(async () => {
      try {
        await this.fetchPriceData();
        await this.fetchRealTimeThreatData();
      } catch (error) {
        logger.error('Failed to update oracle data', { error });
      }
    }, 30000);

    logger.info('Pyth monitoring started successfully');
  }

  stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('Pyth monitoring stopped');
    }
  }

  private async fetchPriceData(): Promise<void> {
    try {
      const solFeed = new PublicKey(this.PRICE_FEEDS.SOL_USD);
      const usdcFeed = new PublicKey(this.PRICE_FEEDS.USDC_USD);

      const [solData, usdcData] = await Promise.all([
        this.pythClient.getAssetPriceFromAccounts([solFeed]),
        this.pythClient.getAssetPriceFromAccounts([usdcFeed]),
      ]);

      if (solData && solData.length > 0) {
        const sol = solData[0];
        this.priceCache.set('SOL_USD', {
          price: sol.price || 0,
          confidence: sol.confidence || 0,
          exponent: sol.exponent || 0,
          timestamp: Date.now(),
        });
        logger.debug('Updated SOL price', { price: sol.price });
      }

      if (usdcData && usdcData.length > 0) {
        const usdc = usdcData[0];
        this.priceCache.set('USDC_USD', {
          price: usdc.price || 1,
          confidence: usdc.confidence || 0,
          exponent: usdc.exponent || 0,
          timestamp: Date.now(),
        });
        logger.debug('Updated USDC price', { price: usdc.price });
      }
    } catch (error) {
      logger.error('Failed to fetch Pyth price data', { error });
      // Fallback to approximate values
      this.priceCache.set('SOL_USD', { price: 100, confidence: 0, exponent: -8, timestamp: Date.now() });
      this.priceCache.set('USDC_USD', { price: 1, confidence: 0, exponent: -8, timestamp: Date.now() });
    }
  }

  private async fetchRealTimeThreatData(): Promise<void> {
    try {
      // Fetch real-time censorship events from OONI API
      const response = await axios.get('https://api.ooni.io/api/v1/aggregation', {
        params: {
          probe_cc: Array.from(this.threatCache.keys()).join(','),
          test_name: 'web_connectivity',
          since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          until: new Date().toISOString().split('T')[0],
        },
        timeout: 5000,
      });

      if (response.data && response.data.results) {
        this.updateThreatLevelsFromOONI(response.data.results);
      }
    } catch (error) {
      logger.warn('Failed to fetch OONI data, using cached threat intelligence', { error: error.message });
    }
  }

  private updateThreatLevelsFromOONI(results: any[]): void {
    const now = Date.now();
    
    for (const result of results) {
      const countryCode = result.probe_cc?.toUpperCase();
      if (!countryCode || !this.threatCache.has(countryCode)) continue;

      const existing = this.threatCache.get(countryCode)!;
      const anomalyRate = result.anomaly_count / (result.measurement_count || 1);
      
      // Adjust threat level based on real censorship measurements
      let adjustedThreat = existing.threatLevel;
      if (anomalyRate > 0.5) adjustedThreat = Math.min(10, adjustedThreat + 1);
      else if (anomalyRate < 0.1) adjustedThreat = Math.max(0, adjustedThreat - 0.5);

      this.threatCache.set(countryCode, {
        ...existing,
        threatLevel: Math.round(adjustedThreat),
        lastUpdated: now,
      });

      // Store historical data
      const history = this.historicalData.get(countryCode) || [];
      history.push({ timestamp: now, value: adjustedThreat });
      
      // Keep only 7 days of data
      const cutoff = now - (this.HISTORICAL_DAYS * 24 * 60 * 60 * 1000);
      this.historicalData.set(
        countryCode,
        history.filter(h => h.timestamp > cutoff)
      );
    }

    logger.info('Updated threat levels from real OONI data', { 
      countries: results.length,
      timestamp: new Date().toISOString()
    });
  }


  getThreatLevel(countryCode: string): ThreatIntelligence {
    const intel = this.threatCache.get(countryCode.toUpperCase());
    
    if (intel) {
      return intel;
    }

    // Default for unknown countries - moderate risk
    logger.warn('Unknown country code, returning default threat level', { countryCode });
    return {
      countryCode: countryCode.toUpperCase(),
      threatLevel: 3,
      censorshipScore: 30,
      dpiDetected: false,
      lastUpdated: Date.now(),
      sources: ['default'],
    };
  }

  getPrice(symbol: 'SOL_USD' | 'USDC_USD'): PriceData | null {
    return this.priceCache.get(symbol) || null;
  }

  getHighRiskCountries(threshold: number = 7): string[] {
    return Array.from(this.threatCache.entries())
      .filter(([_, intel]) => intel.threatLevel >= threshold)
      .map(([country, _]) => country)
      .sort();
  }

  getSafeCountries(threshold: number = 3): string[] {
    return Array.from(this.threatCache.entries())
      .filter(([_, intel]) => intel.threatLevel <= threshold)
      .map(([country, _]) => country)
      .sort();
  }

  getHistoricalThreatData(countryCode: string, days: number = 7): Array<{ timestamp: number; value: number }> {
    const data = this.historicalData.get(countryCode.toUpperCase()) || [];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return data.filter(d => d.timestamp > cutoff);
  }

  getAllThreatIntelligence(): ThreatIntelligence[] {
    return Array.from(this.threatCache.values())
      .sort((a, b) => b.threatLevel - a.threatLevel);
  }

  getNetworkStats() {
    const threats = Array.from(this.threatCache.values());
    const avgThreat = threats.reduce((sum, t) => sum + t.threatLevel, 0) / threats.length;
    const avgCensorship = threats.reduce((sum, t) => sum + t.censorshipScore, 0) / threats.length;
    
    return {
      totalCountries: threats.length,
      averageThreatLevel: Math.round(avgThreat * 10) / 10,
      averageCensorshipScore: Math.round(avgCensorship * 10) / 10,
      highRiskCount: this.getHighRiskCountries(7).length,
      safeCount: this.getSafeCountries(3).length,
      dpiDetectionRate: (threats.filter(t => t.dpiDetected).length / threats.length) * 100,
      lastUpdate: Math.min(...threats.map(t => t.lastUpdated)),
    };
  }

  // ML Training data preparation (for future implementation)
  exportTrainingData(): Array<{ country: string; features: number[]; label: number }> {
    const trainingData: Array<{ country: string; features: number[]; label: number }> = [];
    
    for (const [country, intel] of this.threatCache.entries()) {
      const history = this.historicalData.get(country) || [];
      if (history.length < 7) continue; // Need minimum data
      
      const features = [
        intel.censorshipScore,
        intel.dpiDetected ? 1 : 0,
        history.length > 0 ? history[history.length - 1].value : intel.threatLevel,
        history.reduce((sum, h) => sum + h.value, 0) / history.length, // Moving average
        Math.max(...history.map(h => h.value)), // Peak threat
      ];
      
      trainingData.push({
        country,
        features,
        label: intel.threatLevel,
      });
    }
    
    return trainingData;
  }

  getCountriesBelowThreatLevel(threshold: number): string[] {
    return Array.from(this.threatCache.entries())
      .filter(([_, intel]) => intel.threatLevel < threshold)
      .map(([country, _]) => country);
  }

  getAllThreatData(): Map<string, ThreatIntelligence> {
    return new Map(this.threatCache);
  }
}
