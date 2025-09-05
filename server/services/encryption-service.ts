import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/** Read and validate the key lazily so imports don't crash. */
function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY environment variable is required for API key encryption');

  // Accept hex or base64 for convenience
  const key = /^[0-9a-fA-F]+$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');

  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes (256 bits)');
  }
  return key;
}

export class EncryptionService {
  /** Always fetch the current key (handles env changes in dev). */
  private static get key(): Buffer {
    return loadKey();
  }

  /** Encrypts text and returns iv:authTag:ciphertext (hex). */
  static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

      const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  /** Accepts iv:authTag:ciphertext (hex) and returns the original string. */
  static decrypt(encryptedText: string): string {
    try {
      const [ivHex, authTagHex, ciphertextHex] = encryptedText.split(':');
      if (!ivHex || !authTagHex || !ciphertextHex) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const ciphertext = Buffer.from(ciphertextHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt API key');
    }
  }

  static maskKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) return '****';
    return `${apiKey.substring(0, 8)}${'*'.repeat(Math.max(4, apiKey.length - 12))}${apiKey.substring(apiKey.length - 4)}`;
  }
}
