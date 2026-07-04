import { NextRequest, NextResponse } from 'next/server'
import { pollDeviceFlow, getGitHubOAuthClientId } from '@/lib/github/deviceFlow'
import { fetchAuthenticatedUser } from '@/lib/github/client'
import { encrypt } from '@/lib/crypto'

// The plaintext access token only ever exists in this handler's memory,
// for the duration of this one request — it's encrypted before the
// response leaves the server and is never persisted or logged unencrypted.
export async function POST(req: NextRequest) {
  const clientId = getGitHubOAuthClientId()

  try {
    const { deviceCode } = await req.json()
    if (!deviceCode) {
      return NextResponse.json({ error: 'deviceCode is required' }, { status: 400 })
    }

    const result = await pollDeviceFlow(clientId, deviceCode)

    if (result.status === 'success') {
      const { login } = await fetchAuthenticatedUser(result.access_token)
      return NextResponse.json({
        status: 'success',
        token: encrypt(result.access_token),
        login,
        scope: result.scope,
      })
    }

    if (result.status === 'slow_down') {
      return NextResponse.json({ status: 'slow_down', interval: result.interval })
    }

    if (result.status === 'error') {
      return NextResponse.json({ status: 'error', error: result.error })
    }

    return NextResponse.json({ status: result.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ status: 'error', error: message }, { status: 500 })
  }
}
