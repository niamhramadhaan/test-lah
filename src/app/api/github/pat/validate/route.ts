import { NextRequest, NextResponse } from 'next/server'
import { fetchAuthenticatedUser } from '@/lib/github/client'
import { encrypt } from '@/lib/crypto'

// The plaintext PAT only ever exists in this handler's memory, for the
// duration of this one request — it's encrypted before the response leaves
// the server and is never persisted or logged unencrypted.
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ ok: false, error: 'token is required' }, { status: 400 })
    }

    const { login } = await fetchAuthenticatedUser(token)
    return NextResponse.json({ ok: true, token: encrypt(token), login })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ ok: false, error: message }, { status: 401 })
  }
}
