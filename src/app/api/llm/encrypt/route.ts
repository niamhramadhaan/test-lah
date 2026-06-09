import { NextRequest, NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'

/**
 * POST /api/llm/encrypt
 * Body: { value: string }
 * Returns: { encrypted: string }
 *
 * Encrypts a plaintext API key for client-side storage.
 */
export async function POST(req: NextRequest) {
  try {
    const { value } = await req.json()

    if (!value || typeof value !== 'string') {
      return NextResponse.json({ error: 'Missing value' }, { status: 400 })
    }

    const encrypted = encrypt(value)
    return NextResponse.json({ encrypted })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Encryption failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
