'use client'

import { useState, useEffect } from 'react'
import { useGitHubConfig } from '@/hooks/useGitHubConfig'
import { useStartGitHubDeviceFlow, useGitHubDevicePoll, useValidateGitHubPat } from '@/hooks/useGitHub'

const GITHUB_COLOR = '#181717'

export function GitHubAccordion() {
  const [expanded, setExpanded] = useState(false)
  const { config, isConnected, updateConfig, disconnect } = useGitHubConfig()
  const [mode, setMode] = useState<'device' | 'pat'>('device')

  const startMutation = useStartGitHubDeviceFlow()
  const [deviceCode, setDeviceCode] = useState<string | null>(null)
  const pollQuery = useGitHubDevicePoll(deviceCode, startMutation.data?.interval ?? 5)

  useEffect(() => {
    const data = pollQuery.data
    if (!data || data.status !== 'success') return
    updateConfig({
      authMethod: 'device',
      token: data.token,
      connected: true,
      login: data.login,
      connectedAt: new Date().toISOString(),
    })
    setDeviceCode(null)
    startMutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollQuery.data])

  const handleStartDevice = async () => {
    const data = await startMutation.mutateAsync()
    setDeviceCode(data.deviceCode)
  }

  const [patValue, setPatValue] = useState('')
  const patMutation = useValidateGitHubPat()

  const handleConnectPat = async () => {
    const key = patValue.trim()
    if (!key) return
    const data = await patMutation.mutateAsync(key)
    if (data.ok && data.token && data.login) {
      updateConfig({
        authMethod: 'pat',
        token: data.token,
        connected: true,
        login: data.login,
        connectedAt: new Date().toISOString(),
      })
      setPatValue('')
      patMutation.reset()
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setDeviceCode(null)
    startMutation.reset()
    patMutation.reset()
    setPatValue('')
  }

  const pollData = pollQuery.data
  const pollStatus = pollData?.status

  return (
    <div
      className="rounded-xl border transition-all overflow-hidden"
      style={{
        borderColor: expanded ? 'var(--border-hover)' : 'var(--border)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-secondary)]"
      >
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ backgroundColor: `${GITHUB_COLOR}10` }}
        >
          <svg width="22" height="22" viewBox="0 0 16 16" fill={GITHUB_COLOR}>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>GitHub</span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: isConnected ? 'var(--status-pass-bg)' : 'var(--bg-secondary)',
                color: isConnected ? 'var(--status-pass-text)' : 'var(--text-tertiary)',
              }}
            >
              {isConnected ? `Connected as @${config.login}` : 'Not configured'}
            </span>
          </div>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
            Connect a repo and link GitHub issues to nodes.
          </p>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div style={{ maxHeight: expanded ? '480px' : '0px', overflow: 'hidden', transition: 'max-height 250ms ease-out' }}>
        <div className="px-5 pb-5 pt-1 space-y-3">
          {isConnected ? (
            <div className="flex gap-2">
              <button
                onClick={handleDisconnect}
                className="px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--status-fail-bg)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setMode('device')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: mode === 'device' ? 'var(--bg-secondary)' : 'transparent', color: mode === 'device' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                >
                  Sign in with GitHub
                </button>
                <button
                  onClick={() => setMode('pat')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: mode === 'pat' ? 'var(--bg-secondary)' : 'transparent', color: mode === 'pat' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                >
                  Use a token
                </button>
              </div>

              {mode === 'device' ? (
                <div className="space-y-2">
                  {!deviceCode ? (
                    <>
                      <button
                        onClick={handleStartDevice}
                        disabled={startMutation.isPending}
                        className="px-4 py-2 text-xs font-medium rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
                        style={{ backgroundColor: GITHUB_COLOR, color: '#fff' }}
                      >
                        {startMutation.isPending ? 'Starting…' : 'Connect with GitHub'}
                      </button>
                      {startMutation.isError && (
                        <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>
                          {startMutation.error instanceof Error ? startMutation.error.message : 'Failed to start device flow'}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-3 space-y-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Enter this code at</p>
                      <a
                        href={startMutation.data?.verificationUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium underline block"
                        style={{ color: 'var(--accent)' }}
                      >
                        {startMutation.data?.verificationUri?.replace('https://', '')}
                      </a>
                      <p className="text-2xl font-mono font-semibold tracking-widest" style={{ color: 'var(--text-primary)' }}>
                        {startMutation.data?.userCode}
                      </p>
                      {pollStatus === 'expired' ? (
                        <p className="text-[11px]" style={{ color: 'var(--status-fail-text)' }}>Code expired — try again.</p>
                      ) : pollStatus === 'error' ? (
                        <p className="text-[11px]" style={{ color: 'var(--status-fail-text)' }}>
                          {pollData && 'error' in pollData ? pollData.error : 'Something went wrong'}
                        </p>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeDasharray="30 70" />
                          </svg>
                          Waiting for authorization...
                        </div>
                      )}
                      {(pollStatus === 'expired' || pollStatus === 'error') && (
                        <button
                          onClick={() => { setDeviceCode(null); startMutation.reset() }}
                          className="text-[11px] underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          Try again
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={patValue}
                      onChange={e => { setPatValue(e.target.value); patMutation.reset() }}
                      placeholder="github_pat_..."
                      className="flex-1 px-3 py-2 text-sm rounded-lg outline-none border transition-colors focus:border-[var(--accent)]"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleConnectPat() }}
                    />
                    <button
                      onClick={handleConnectPat}
                      disabled={patMutation.isPending || !patValue.trim()}
                      className="px-4 py-2 text-xs font-medium rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: GITHUB_COLOR, color: '#fff' }}
                    >
                      {patMutation.isPending ? 'Testing…' : 'Test & Connect'}
                    </button>
                  </div>
                  {patMutation.data && !patMutation.data.ok && (
                    <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>
                      Failed: {patMutation.data.error}
                    </div>
                  )}
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    Recommend a fine-grained token scoped to the repo(s) you need, with{' '}
                    <strong>Issues: Read-only</strong> and <strong>Metadata: Read-only</strong> permissions — never grant write access. Create one at{' '}
                    <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                      github.com/settings/personal-access-tokens
                    </a>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
