import crypto from 'crypto'

const ALGO   = 'aes-256-gcm'
const IV_LEN = 12  // 96-bit nonce — recommended for GCM
const TAG_LEN = 16
const VERSION = 1  // stored as 4-byte big-endian prefix for future key rotation

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY env var is not set')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)')
  return key
}

/**
 * Encrypt a buffer using AES-256-GCM.
 * Output format: [4B version][12B IV][16B auth-tag][ciphertext]
 */
export function encrypt(data: Buffer): Buffer {
  const key = getKey()
  const iv  = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()])
  const tag = cipher.getAuthTag()
  const version = Buffer.alloc(4)
  version.writeUInt32BE(VERSION, 0)
  return Buffer.concat([version, iv, tag, ciphertext])
}

/**
 * Decrypt a buffer produced by encrypt().
 * Throws if the version, key, IV, or auth-tag is wrong.
 */
export function decrypt(data: Buffer): Buffer {
  if (data.length < 4 + IV_LEN + TAG_LEN) throw new Error('Encrypted data too short')
  const version = data.readUInt32BE(0)
  if (version !== VERSION) throw new Error(`Unknown encryption version: ${version}`)
  const iv         = data.subarray(4, 4 + IV_LEN)
  const tag        = data.subarray(4 + IV_LEN, 4 + IV_LEN + TAG_LEN)
  const ciphertext = data.subarray(4 + IV_LEN + TAG_LEN)
  const key = getKey()
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

/** Returns true if the buffer starts with a known encryption header. */
export function isEncrypted(data: Buffer): boolean {
  if (data.length < 4) return false
  return data.readUInt32BE(0) === VERSION
}

/**
 * Generate a new 32-byte key and print it as hex.
 * Run once: node -e "require('./lib/encryption').generateKey()"
 */
export function generateKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
