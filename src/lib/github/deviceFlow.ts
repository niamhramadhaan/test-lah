// Public OAuth App Client ID for test-lah's own GitHub App, registered by
// the project maintainer with Device Flow enabled. A Client ID is not a
// secret (it's sent in every device-flow request and visible in network
// traffic anyway), so it's safe to ship baked into the published package —
// this is what lets "Sign in with GitHub" work with zero setup for npm
// installs. Self-hosters/forks can still override it via
// GITHUB_OAUTH_CLIENT_ID to use their own registered OAuth App instead.
const DEFAULT_GITHUB_OAUTH_CLIENT_ID = 'Ov23liHJvGpOy3eXfSae'

export function getGitHubOAuthClientId(): string {
  return process.env.GITHUB_OAUTH_CLIENT_ID || DEFAULT_GITHUB_OAUTH_CLIENT_ID
}

export interface DeviceFlowStart {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export type DeviceFlowPollResult =
  | { status: 'success'; access_token: string; scope: string }
  | { status: 'pending' }
  | { status: 'slow_down'; interval: number }
  | { status: 'expired' }
  | { status: 'error'; error: string }

export async function startDeviceFlow(clientId: string, scope = 'repo'): Promise<DeviceFlowStart> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope }),
  })
  if (!res.ok) {
    throw new Error(`Failed to start GitHub device flow (status ${res.status})`)
  }
  return res.json()
}

export async function pollDeviceFlow(clientId: string, deviceCode: string): Promise<DeviceFlowPollResult> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  })
  const data = await res.json()

  if (data.access_token) {
    return { status: 'success', access_token: data.access_token, scope: data.scope ?? '' }
  }

  switch (data.error) {
    case 'authorization_pending':
      return { status: 'pending' }
    case 'slow_down':
      return { status: 'slow_down', interval: data.interval ?? 10 }
    case 'expired_token':
      return { status: 'expired' }
    default:
      return { status: 'error', error: data.error_description || data.error || 'Unknown device flow error' }
  }
}
