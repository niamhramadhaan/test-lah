'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { GitHubRepoLink } from '@/types'
import { useGitHubConfig } from '@/hooks/useGitHubConfig'
import { useGitHubRepos } from '@/hooks/useGitHub'

interface GitHubRepoCardProps {
  repo: GitHubRepoLink | undefined
  onUpdate: (repo: GitHubRepoLink | undefined) => void
}

export function GitHubRepoCard({ repo, onUpdate }: GitHubRepoCardProps) {
  const { config, isConnected } = useGitHubConfig()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const reposQuery = useGitHubRepos(config.token, open)

  const filtered = useMemo(() => {
    const repos = reposQuery.data?.repos ?? []
    const q = search.trim().toLowerCase()
    if (!q) return repos
    return repos.filter(r => r.fullName.toLowerCase().includes(q))
  }, [reposQuery.data, search])

  if (!isConnected) {
    return (
      <div className="p-3 rounded-md border" style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-md)' }}>
        <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>GitHub Repo</div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Link href="/integrations" className="underline" style={{ color: 'var(--accent)' }}>Connect GitHub</Link> to link a repository.
        </div>
      </div>
    )
  }

  if (repo) {
    return (
      <div className="p-3 rounded-md border" style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-md)' }}>
        <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>GitHub Repo</div>
        <div className="flex items-center gap-2">
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline truncate"
            style={{ color: 'var(--accent)' }}
          >
            {repo.fullName}
          </a>
          <button
            onClick={() => onUpdate(undefined)}
            className="text-xs flex-shrink-0"
            style={{ color: 'var(--status-fail-text)' }}
            title="Unlink repository"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-md border relative" style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-md)' }}>
      <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>GitHub Repo</div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Link a repository
        </button>
      ) : (
        <div>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search owner/repo..."
            className="w-full px-2 py-1 text-xs rounded border outline-none transition-colors focus:border-[var(--accent)]"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <div
            className="absolute left-0 right-0 mt-1 rounded-md border overflow-auto z-10"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', maxHeight: 220 }}
          >
            {reposQuery.isLoading && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading repositories...</div>
            )}
            {reposQuery.isError && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--status-fail-text)' }}>
                {reposQuery.error instanceof Error ? reposQuery.error.message : 'Failed to load repositories'}
              </div>
            )}
            {reposQuery.isSuccess && filtered.length === 0 && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>No repositories found.</div>
            )}
            {filtered.map(r => (
              <button
                key={r.fullName}
                onClick={() => {
                  onUpdate({ owner: r.owner, repo: r.repo, fullName: r.fullName })
                  setOpen(false)
                  setSearch('')
                }}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ color: 'var(--text-primary)' }}
              >
                {r.fullName}
              </button>
            ))}
            <button
              onClick={() => { setOpen(false); setSearch('') }}
              className="w-full text-left px-3 py-1.5 text-[10px] border-t transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
