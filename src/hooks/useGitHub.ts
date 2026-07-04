'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { GitHubRepoSummary, GitHubIssueSummary } from '@/lib/github/client'

export interface GitHubDeviceStartResult {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

async function startDevice(): Promise<GitHubDeviceStartResult> {
  const res = await fetch('/api/github/device/start', { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to start GitHub device flow')
  return data
}

export function useStartGitHubDeviceFlow() {
  return useMutation({ mutationFn: startDevice })
}

export type GitHubDevicePollStatus =
  | { status: 'success'; token: string; login: string; scope: string }
  | { status: 'pending' }
  | { status: 'slow_down'; interval: number }
  | { status: 'expired' }
  | { status: 'error'; error: string }

async function pollDevice(deviceCode: string): Promise<GitHubDevicePollStatus> {
  const res = await fetch('/api/github/device/poll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceCode }),
  })
  return res.json()
}

/**
 * Polls at the interval GitHub's device flow last reported, stopping
 * automatically once a terminal status (success/expired/error) is reached.
 */
export function useGitHubDevicePoll(deviceCode: string | null, initialInterval: number) {
  return useQuery({
    queryKey: queryKeys.github.deviceFlow,
    queryFn: () => pollDevice(deviceCode as string),
    enabled: !!deviceCode,
    refetchInterval: query => {
      const data = query.state.data as GitHubDevicePollStatus | undefined
      if (!data) return initialInterval * 1000
      if (data.status === 'pending') return initialInterval * 1000
      if (data.status === 'slow_down') return data.interval * 1000
      return false
    },
  })
}

interface TestPatResult {
  ok: boolean
  token?: string
  login?: string
  error?: string
}

async function validatePat(token: string): Promise<TestPatResult> {
  const res = await fetch('/api/github/pat/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  return res.json()
}

export function useValidateGitHubPat() {
  return useMutation({ mutationFn: validatePat })
}

async function fetchRepos(token: string): Promise<{ repos: GitHubRepoSummary[] }> {
  const res = await fetch('/api/github/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to list repositories')
  return data
}

export function useGitHubRepos(token: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.github.repos,
    queryFn: () => fetchRepos(token as string),
    enabled: !!token && enabled,
  })
}

async function fetchIssues(
  token: string,
  owner: string,
  repo: string,
  opts: { state?: 'open' | 'closed' | 'all'; q?: string; page?: number },
): Promise<{ issues: GitHubIssueSummary[]; hasMore: boolean }> {
  const res = await fetch('/api/github/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, owner, repo, ...opts }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to list issues')
  return data
}

export function useGitHubIssues(
  token: string | null,
  owner: string | null,
  repo: string | null,
  opts: { state?: 'open' | 'closed' | 'all'; q?: string; page?: number } = {},
) {
  return useQuery({
    queryKey: [...queryKeys.github.issues(owner ?? '', repo ?? ''), opts.state ?? 'open', opts.q ?? '', opts.page ?? 1],
    queryFn: () => fetchIssues(token as string, owner as string, repo as string, opts),
    enabled: !!token && !!owner && !!repo,
  })
}

export function useInvalidateGitHubRepos() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.github.repos })
}
