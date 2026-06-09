/**
 * Server-side AES-256-GCM encryption for API keys.
 *
 * Uses a key derived from ENCRYPTION_KEY env var via SHA-256.
 * Each encryption uses a random IV; ciphertext format: base64(iv + authTag + ciphertext)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  return createHash('sha256').update(raw).digest()
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded blob.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Pack: iv (12) + authTag (16) + ciphertext (variable)
  const packed = Buffer.concat([iv, authTag, encrypted])
  return 'enc:' + packed.toString('base64')
}

/**
 * Decrypt a base64-encoded blob produced by encrypt().
 * If the input doesn't start with 'enc:', it's returned as-is (plaintext passthrough).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith('enc:')) {
    return ciphertext
  }

  const key = getEncryptionKey()
  const packed = Buffer.from(ciphertext.slice(4), 'base64')

  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if a value is encrypted (starts with 'enc:').
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith('enc:')
}
