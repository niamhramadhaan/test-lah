import { NextResponse } from 'next/server'
import { startDeviceFlow, getGitHubOAuthClientId } from '@/lib/github/deviceFlow'

export async function POST() {
  const clientId = getGitHubOAuthClientId()

  try {
    const data = await startDeviceFlow(clientId)
    return NextResponse.json({
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      expiresIn: data.expires_in,
      interval: data.interval,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
