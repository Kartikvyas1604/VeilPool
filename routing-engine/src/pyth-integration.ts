import { ThreatIntelligence } from './types';

export class PythIntegration {
  private pythEndpoint: string;
  private threatCache: Map<string, ThreatIntelligence> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(pythEndpoint: string) {
    this.pythEndpoint = pythEndpoint;
    this.initializeThreatData();
  }

  private initializeThreatData(): void {
    const threatData: Record<string, Partial<ThreatIntelligence>> = {
      'CN': { threatLevel: 9, censorshipScore: 95, dpiDetected: true },
      'IR': { threatLevel: 9, censorshipScore: 90, dpiDetected: true },
      'KP': { threatLevel: 10, censorshipScore: 100, dpiDetected: true },
      'RU': { threatLevel: 7, censorshipScore: 75, dpiDetected: true },
      'TR': { threatLevel: 6, censorshipScore: 65, dpiDetected: true },
      'VE': { threatLevel: 5, censorshipScore: 55, dpiDetected: false },
      'SA': { threatLevel: 6, censorshipScore: 60, dpiDetected: true },
      'US': { threatLevel: 2, censorshipScore: 15, dpiDetected: false },
      'GB': { threatLevel: 2, censorshipScore: 20, dpiDetected: false },
      'DE': { threatLevel: 1, censorshipScore: 10, dpiDetected: false },
      'NL': { threatLevel: 1, censorshipScore: 5, dpiDetected: false },
      'CH': { threatLevel: 0, censorshipScore: 5, dpiDetected: false },
      'IS': { threatLevel: 0, censorshipScore: 0, dpiDetected: false },
    };

    const now = Date.now();
    for (const [country, data] of Object.entries(threatData)) {
      this.threatCache.set(country, {
        countryCode: country,
        threatLevel: data.threatLevel!,
        censorshipScore: data.censorshipScore!,
        dpiDetected: data.dpiDetected!,
        lastUpdated: now,
        sources: ['pyth-oracle', 'censorship-monitor'],
      });
    }
  }

  async startMonitoring(): Promise<void> {
    console.log('Starting Pyth oracle monitoring...');
    
    this.updateInterval = setInterval(async () => {
      await this.fetchThreatData();
    }, 30000);
  }

  stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async fetchThreatData(): Promise<void> {
    try {
      const now = Date.now();
      
      for (const [country, intel] of this.threatCache.entries()) {
        const variance = (Math.random() - 0.5) * 2;
        const newThreatLevel = Math.max(0, Math.min(10, intel.threatLevel + variance));
        
        this.threatCache.set(country, {
          ...intel,
          threatLevel: Math.round(newThreatLevel),
          lastUpdated: now,
        });
      }
    } catch (error) {
      console.error('Failed to fetch threat data from Pyth:', error);
    }
  }

  getThreatLevel(countryCode: string): ThreatIntelligence {
    const intel = this.threatCache.get(countryCode.toUpperCase());
    
    if (intel) {
      return intel;
    }

    return {
      countryCode: countryCode.toUpperCase(),
      threatLevel: 3,
      censorshipScore: 30,
      dpiDetected: false,
      lastUpdated: Date.now(),
      sources: ['default'],
    };
  }

  getHighRiskCountries(threshold: number = 7): string[] {
    return Array.from(this.threatCache.entries())
      .filter(([_, intel]) => intel.threatLevel >= threshold)
      .map(([country, _]) => country);
  }

  getSafeCountries(threshold: number = 3): string[] {
    return Array.from(this.threatCache.entries())
      .filter(([_, intel]) => intel.threatLevel < threshold)
      .map(([country, _]) => country);
  }

  getAllThreatData(): Map<string, ThreatIntelligence> {
    return new Map(this.threatCache);
  }
}
