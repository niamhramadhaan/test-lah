'use client'

import { useState, useEffect } from 'react'
import { FlowNode, GitHubRepoLink, LinkedGitHubIssue } from '@/types'
import { useGitHubConfig } from '@/hooks/useGitHubConfig'
import { useGitHubIssues } from '@/hooks/useGitHub'

interface LinkedIssuesSectionProps {
  node: FlowNode
  githubRepo: GitHubRepoLink | undefined
  onUpdateNode: (id: string, patch: Partial<FlowNode>) => void
}

const SEARCH_DEBOUNCE_MS = 300

export function LinkedIssuesSection({ node, githubRepo, onUpdateNode }: LinkedIssuesSectionProps) {
  const { config, isConnected } = useGitHubConfig()
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const issuesQuery = useGitHubIssues(
    config.token,
    searching ? githubRepo?.owner ?? null : null,
    searching ? githubRepo?.repo ?? null : null,
    { q: debouncedQuery || undefined, state: 'all' },
  )

  const linkedIssues = node.linkedIssues ?? []
  const linkedNumbers = new Set(linkedIssues.map(i => i.number))

  const unlinkIssue = (number: number) => {
    onUpdateNode(node.id, { linkedIssues: linkedIssues.filter(i => i.number !== number) })
  }

  const linkIssue = (issue: { number: number; title: string; url: string; state: 'open' | 'closed'; body: string | null }) => {
    if (linkedNumbers.has(issue.number)) return
    const next: LinkedGitHubIssue = {
      number: issue.number,
      title: issue.title,
      url: issue.url,
      state: issue.state,
      body: issue.body ?? undefined,
      linkedAt: new Date().toISOString(),
    }
    onUpdateNode(node.id, { linkedIssues: [...linkedIssues, next] })
    setSearching(false)
    setQuery('')
  }

  if (!isConnected || !githubRepo) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {!isConnected ? 'Connect GitHub in Integrations to link issues.' : 'Link a GitHub repo in the project summary to link issues.'}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {linkedIssues.length > 0 && (
        <div className="flex flex-col gap-1">
          {linkedIssues.map(issue => (
            <div key={issue.number} className="flex items-center gap-2 group">
              <a
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline truncate"
                style={{ color: issue.state === 'open' ? 'var(--status-pass-text)' : 'var(--text-tertiary)' }}
                title={issue.title}
              >
                #{issue.number} {issue.title}
              </a>
              <button
                onClick={() => unlinkIssue(issue.number)}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: 'var(--status-fail-text)' }}
                title="Unlink issue"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {!searching ? (
        <button
          onClick={() => setSearching(true)}
          className="text-xs hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          + Link an issue
        </button>
      ) : (
        <div className="relative">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search issues in ${githubRepo.fullName}...`}
            className="w-full px-2 py-1 text-xs rounded border outline-none transition-colors focus:border-[var(--accent)]"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <div
            className="mt-1 rounded-md border overflow-auto"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', maxHeight: 180 }}
          >
            {issuesQuery.isLoading && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading issues...</div>
            )}
            {issuesQuery.isError && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--status-fail-text)' }}>
                {issuesQuery.error instanceof Error ? issuesQuery.error.message : 'Failed to load issues'}
              </div>
            )}
            {issuesQuery.isSuccess && issuesQuery.data.issues.length === 0 && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>No issues found.</div>
            )}
            {issuesQuery.data?.issues.map(issue => (
              <button
                key={issue.number}
                onClick={() => linkIssue(issue)}
                disabled={linkedNumbers.has(issue.number)}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-40"
                style={{ color: 'var(--text-primary)' }}
              >
                #{issue.number} {issue.title}
              </button>
            ))}
            <button
              onClick={() => { setSearching(false); setQuery('') }}
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
