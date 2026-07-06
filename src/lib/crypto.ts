/**
 * Server-side AES-256-GCM encryption for API keys.
 *
 * Uses a key derived from ENCRYPTION_KEY env var via SHA-256.
 * Each encryption uses a random IV; ciphertext format: base64(iv + authTag + ciphertext)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { getDataDir } from '@/lib/dataDir'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_FILE = path.join(getDataDir(), 'encryption.key')

let cachedKeySource: string | null = null

// Resolves the raw key material for encryption: an explicit ENCRYPTION_KEY
// env var always wins (for deployments with ephemeral/serverless filesystems
// that need a stable, externally-managed secret). Otherwise, a random key is
// generated once and persisted next to the local state file
// (.ayu-data/encryption.key) so a zero-config `npx test-lah` run still
// encrypts data at rest with no setup, and the same key survives restarts so
// previously-encrypted values stay decryptable.
function getKeySource(): string {
  if (process.env.ENCRYPTION_KEY) return process.env.ENCRYPTION_KEY
  if (cachedKeySource) return cachedKeySource

  try {
    if (fs.existsSync(KEY_FILE)) {
      cachedKeySource = fs.readFileSync(KEY_FILE, 'utf-8').trim()
      return cachedKeySource
    }
    fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true })
    const generated = randomBytes(32).toString('hex')
    const tmpFile = `${KEY_FILE}.${process.pid}.tmp`
    fs.writeFileSync(tmpFile, generated, { mode: 0o600 })
    fs.renameSync(tmpFile, KEY_FILE)
    cachedKeySource = generated
    return generated
  } catch (err) {
    throw new Error(
      `ENCRYPTION_KEY is not set, and a local key could not be generated at ${KEY_FILE}: ${err instanceof Error ? err.message : String(err)}. Set ENCRYPTION_KEY explicitly (required on read-only/ephemeral filesystems, e.g. most serverless hosts).`
    )
  }
}

function getEncryptionKey(): Buffer {
  return createHash('sha256').update(getKeySource()).digest()
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
