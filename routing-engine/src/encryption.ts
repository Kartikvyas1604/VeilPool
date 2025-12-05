import crypto from 'crypto';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedData {
  iv: string;
  authTag: string;
  encrypted: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class EncryptionManager {
  private symmetricKey: Buffer | null = null;
  private keyPair: { publicKey: string; privateKey: string } | null = null;

  constructor() {}

  generateSymmetricKey(): Buffer {
    this.symmetricKey = crypto.randomBytes(KEY_LENGTH);
    return this.symmetricKey;
  }

  setSymmetricKey(key: Buffer): void {
    if (key.length !== KEY_LENGTH) {
      throw new Error(`Key must be ${KEY_LENGTH} bytes`);
    }
    this.symmetricKey = key;
  }

  /**
   * Derive a key from a password using PBKDF2
   */
  deriveKeyFromPassword(password: string, salt?: Buffer): { key: Buffer; salt: Buffer } {
    const finalSalt = salt || crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(password, finalSalt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
    return { key, salt: finalSalt };
  }

  /**
   * Generate RSA key pair for asymmetric encryption (key exchange)
   */
  generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    this.keyPair = { publicKey, privateKey };
    return this.keyPair;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(plaintext: string | Buffer): EncryptedData {
    if (!this.symmetricKey) {
      throw new Error('Symmetric key not set. Call generateSymmetricKey() first.');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.symmetricKey, iv);

    const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
    
    const encrypted = Buffer.concat([
      cipher.update(plaintextBuffer),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encrypted: encrypted.toString('base64'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData): Buffer {
    if (!this.symmetricKey) {
      throw new Error('Symmetric key not set.');
    }

    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.symmetricKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted;
  }

  /**
   * Encrypt symmetric key with RSA public key (for key exchange)
   */
  encryptSymmetricKey(publicKeyPem: string, symmetricKey?: Buffer): string {
    const keyToEncrypt = symmetricKey || this.symmetricKey;
    if (!keyToEncrypt) {
      throw new Error('No symmetric key to encrypt');
    }

    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      keyToEncrypt
    );

    return encrypted.toString('base64');
  }

  /**
   * Decrypt symmetric key with RSA private key (for key exchange)
   */
  decryptSymmetricKey(encryptedKey: string, privateKeyPem?: string): Buffer {
    const privateKey = privateKeyPem || this.keyPair?.privateKey;
    if (!privateKey) {
      throw new Error('No private key available');
    }

    const encryptedBuffer = Buffer.from(encryptedKey, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      encryptedBuffer
    );

    return decrypted;
  }

  /**
   * Sign data with private key
   */
  sign(data: string | Buffer): string {
    if (!this.keyPair?.privateKey) {
      throw new Error('Private key not available');
    }

    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const signature = crypto.sign('sha256', dataBuffer, {
      key: this.keyPair.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    });

    return signature.toString('base64');
  }

  /**
   * Verify signature with public key
   */
  verify(data: string | Buffer, signature: string, publicKeyPem: string): boolean {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const signatureBuffer = Buffer.from(signature, 'base64');

    return crypto.verify(
      'sha256',
      dataBuffer,
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      },
      signatureBuffer
    );
  }

  /**
   * Generate a secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Hash data with SHA-256
   */
  static hash(data: string | Buffer): string {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return crypto.createHash('sha256').update(dataBuffer).digest('hex');
  }

  /**
   * Constant-time comparison for security-sensitive operations
   */
  static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Export current configuration
   */
  exportConfig(): any {
    return {
      hasSymmetricKey: !!this.symmetricKey,
      hasKeyPair: !!this.keyPair,
      publicKey: this.keyPair?.publicKey,
    };
  }
}

/**
 * Session-based encryption for VPN connections
 * Each connection gets its own encryption session
 */
export class EncryptionSession {
  private encryptionManager: EncryptionManager;
  private sessionId: string;
  private createdAt: number;
  private bytesEncrypted: number = 0;
  private bytesDecrypted: number = 0;

  constructor(sessionId: string, symmetricKey?: Buffer) {
    this.sessionId = sessionId;
    this.encryptionManager = new EncryptionManager();
    this.createdAt = Date.now();

    if (symmetricKey) {
      this.encryptionManager.setSymmetricKey(symmetricKey);
    } else {
      this.encryptionManager.generateSymmetricKey();
    }

    logger.info('Encryption session created', { sessionId });
  }

  encrypt(data: Buffer): EncryptedData {
    const encrypted = this.encryptionManager.encrypt(data);
    this.bytesEncrypted += data.length;
    return encrypted;
  }

  decrypt(encryptedData: EncryptedData): Buffer {
    const decrypted = this.encryptionManager.decrypt(encryptedData);
    this.bytesDecrypted += decrypted.length;
    return decrypted;
  }

  getSessionStats() {
    return {
      sessionId: this.sessionId,
      age: Date.now() - this.createdAt,
      bytesEncrypted: this.bytesEncrypted,
      bytesDecrypted: this.bytesDecrypted,
    };
  }

  destroy() {
    logger.info('Encryption session destroyed', this.getSessionStats());
  }
}

/**
 * Key Exchange Protocol for establishing secure connections
 */
export class KeyExchangeProtocol {
  private serverKeyPair: KeyPair;
  private activeSessions: Map<string, EncryptionSession> = new Map();

  constructor() {
    const manager = new EncryptionManager();
    this.serverKeyPair = manager.generateKeyPair();
    logger.info('Key exchange protocol initialized');
  }

  /**
   * Get server's public key for clients
   */
  getServerPublicKey(): string {
    return this.serverKeyPair.publicKey;
  }

  /**
   * Handle client key exchange request
   * Client sends encrypted symmetric key using server's public key
   */
  handleKeyExchange(sessionId: string, encryptedSymmetricKey: string): EncryptionSession {
    const manager = new EncryptionManager();
    manager.generateKeyPair();
    
    // Decrypt the client's symmetric key
    const symmetricKey = manager.decryptSymmetricKey(
      encryptedSymmetricKey,
      this.serverKeyPair.privateKey
    );

    // Create encryption session
    const session = new EncryptionSession(sessionId, symmetricKey);
    this.activeSessions.set(sessionId, session);

    logger.info('Key exchange completed', { sessionId });
    return session;
  }

  /**
   * Get an active encryption session
   */
  getSession(sessionId: string): EncryptionSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Terminate an encryption session
   */
  terminateSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.destroy();
      this.activeSessions.delete(sessionId);
      logger.info('Session terminated', { sessionId });
    }
  }

  /**
   * Get stats for all active sessions
   */
  getActiveSessionsStats() {
    return Array.from(this.activeSessions.values()).map(s => s.getSessionStats());
  }

  /**
   * Clean up expired sessions (older than maxAge)
   */
  cleanupExpiredSessions(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions) {
      const stats = session.getSessionStats();
      if (stats.age > maxAge) {
        this.terminateSession(sessionId);
      }
    }
  }
}

// Singleton instance
export const keyExchangeProtocol = new KeyExchangeProtocol();

// Periodic cleanup of expired sessions (every 5 minutes)
setInterval(() => {
  keyExchangeProtocol.cleanupExpiredSessions();
}, 300000);
