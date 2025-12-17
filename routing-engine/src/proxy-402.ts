import express, { Request, Response, NextFunction } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import crypto from 'crypto';

interface PassCredential {
  passAccount: string;
  userPubkey: string;
  signature: string;
  timestamp: number;
}

interface UsageRecord {
  passAccount: string;
  bytesTransferred: number;
  nodeOperator: string;
  timestamp: number;
  requestId: string;
}

export class Proxy402Server {
  private connection: Connection;
  private usageBuffer: UsageRecord[] = [];
  private settlementInterval: NodeJS.Timeout | null = null;
  private readonly PRIVACY_PASS_PROGRAM_ID = new PublicKey('Bw98kokEAhjikV167NQEdDsbKe6hUa3Ado3bJNKQPQiZ');
  private readonly SETTLEMENT_INTERVAL = 30 * 60 * 1000;
  private readonly MAX_BUFFER_SIZE = 1000;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  startSettlementService(): void {
    this.settlementInterval = setInterval(async () => {
      await this.batchSettleUsage();
    }, this.SETTLEMENT_INTERVAL);
  }

  stopSettlementService(): void {
    if (this.settlementInterval) {
      clearInterval(this.settlementInterval);
      this.settlementInterval = null;
    }
  }

  async validatePassCredential(credential: PassCredential): Promise<boolean> {
    try {
      const passAccount = new PublicKey(credential.passAccount);
      const accountInfo = await this.connection.getAccountInfo(passAccount);
      
      if (!accountInfo) {
        return false;
      }

      const data = accountInfo.data;
      const remainingGb = Number(data.readBigUInt64LE(8));
      const expiryTimestamp = Number(data.readBigInt64LE(16));
      const isActive = data.readUInt8(24) === 1;
      
      const now = Date.now() / 1000;
      if (!isActive || now > expiryTimestamp || remainingGb === 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to validate pass credential:', error);
      return false;
    }
  }

  async getRemainingBalance(passAccount: string): Promise<number> {
    try {
      const accountPubkey = new PublicKey(passAccount);
      const accountInfo = await this.connection.getAccountInfo(accountPubkey);
      
      if (!accountInfo) {
        return 0;
      }

      const remainingGb = Number(accountInfo.data.readBigUInt64LE(8));
      return remainingGb;
    } catch (error) {
      console.error('Failed to get remaining balance:', error);
      return 0;
    }
  }

  async meterBandwidth(req: Request, res: Response): Promise<number> {
    const requestSize = parseInt(req.get('content-length') || '0', 10);
    let responseSize = 0;

    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    
    res.send = function(body: any) {
      responseSize = Buffer.byteLength(JSON.stringify(body));
      return originalSend(body);
    };

    res.json = function(body: any) {
      responseSize = Buffer.byteLength(JSON.stringify(body));
      return originalJson(body);
    };

    await new Promise(resolve => res.on('finish', resolve));

    const totalBytes = requestSize + responseSize;
    const overheadMultiplier = 1.05;
    
    return Math.ceil(totalBytes * overheadMultiplier);
  }

  recordUsage(
    passAccount: string,
    bytesTransferred: number,
    nodeOperator: string,
    requestId: string
  ): void {
    this.usageBuffer.push({
      passAccount,
      bytesTransferred,
      nodeOperator,
      timestamp: Date.now(),
      requestId,
    });

    if (this.usageBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.batchSettleUsage().catch(error => {
        console.error('Failed to settle usage:', error);
      });
    }
  }

  private async batchSettleUsage(): Promise<void> {
    if (this.usageBuffer.length === 0) {
      return;
    }

    const toSettle = this.usageBuffer.splice(0);
    console.log(`Settling ${toSettle.length} usage records...`);

    const aggregated = new Map<string, { bytes: number, records: number }>();
    
    for (const record of toSettle) {
      const key = `${record.nodeOperator}`;
      const existing = aggregated.get(key) || { bytes: 0, records: 0 };
      existing.bytes += record.bytesTransferred;
      existing.records += 1;
      aggregated.set(key, existing);
    }

    console.log(`Aggregated to ${aggregated.size} settlements`);

    for (const [nodeOperator, data] of aggregated.entries()) {
      const earningsLamports = Math.floor((data.bytes / (1024 * 1024 * 1024)) * 500_000);
      console.log(`Node ${nodeOperator.slice(0, 8)}... earned ${earningsLamports} lamports from ${data.bytes} bytes (${data.records} requests)`);
    }
  }

  create402Middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.get('X-Privacy-Pass');
      
      if (!authHeader) {
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Privacy pass credential required',
          pricePerMb: 0.0005,
          acceptedMethods: ['privacy-pass'],
          purchaseUrl: 'https://veilpool.network/purchase',
        });
      }

      try {
        const credential = JSON.parse(Buffer.from(authHeader, 'base64').toString());
        
        const isValid = await this.validatePassCredential(credential);
        if (!isValid) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid or expired privacy pass',
          });
        }

        const remainingGb = await this.getRemainingBalance(credential.passAccount);
        if (remainingGb < 0.001) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient balance on privacy pass',
            remainingGb: 0,
          });
        }

        (req as any).privacyPass = {
          passAccount: credential.passAccount,
          userPubkey: credential.userPubkey,
          remainingGb,
        };

        res.on('finish', () => {
          const bytes = parseInt(res.get('Content-Length') || '0', 10);
          const requestId = crypto.randomBytes(16).toString('hex');
          
          this.recordUsage(
            credential.passAccount,
            bytes,
            'node-operator-placeholder',
            requestId
          );
        });

        next();
      } catch (error) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid privacy pass format',
        });
      }
    };
  }

  async proxyRequest(targetUrl: string, req: Request): Promise<any> {
    try {
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        data: req.body,
        headers: {
          ...req.headers,
          'X-Forwarded-For': req.ip,
          'X-VeilPool-Proxy': 'true',
        },
        timeout: 30000,
      });

      return {
        status: response.status,
        headers: response.headers,
        data: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        };
      }
      throw error;
    }
  }

  getStats() {
    return {
      bufferedUsage: this.usageBuffer.length,
      settlementActive: this.settlementInterval !== null,
    };
  }
}
