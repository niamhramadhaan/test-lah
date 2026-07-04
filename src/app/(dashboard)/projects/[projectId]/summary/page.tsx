'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useDashboard } from '@/context/DashboardContext'
import { useLLMConfig } from '@/hooks/useLLMConfig'
import { refineNotes } from '@/lib/llm'
import { downloadMarkdown, downloadJSON, downloadCSV, downloadXLSX } from '@/lib/export'
import { GitHubRepoCard } from '@/components/summary/GitHubRepoCard'

export default function SummaryPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { projects, updateProject } = useDashboard()
  const { activeProvider, activeProviderId, isConnected } = useLLMConfig()
  const project = projects[projectId]
  const [exportOpen, setExportOpen] = useState(false)
  const refineMutation = useMutation({
    mutationFn: (input: Parameters<typeof refineNotes>) => refineNotes(...input),
  })
  const refining = refineMutation.isPending

  const handleNotesChange = useCallback((value: string) => {
    if (!project) return
    updateProject(project.id, p => ({ ...p, notes: value }))
  }, [project, updateProject])

  const handleRefine = useCallback(async () => {
    if (!project || !activeProvider || !isConnected) return
    try {
      const refined = await refineMutation.mutateAsync([
        project.name,
        project.notes || '',
        activeProvider.apiKey,
        activeProviderId || 'google',
        activeProvider.defaultModel,
        activeProvider.baseURL,
      ])
      updateProject(project.id, p => ({ ...p, notes: refined }))
    } catch (err) {
      console.error('Refine failed:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, updateProject, activeProvider, activeProviderId, isConnected])

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: 'var(--text-tertiary)' }}>Project not found.</p>
      </div>
    )
  }

  const allCases = Object.values(project.testCases).flat()
  const totalNodes = project.flows.length
  const totalCases = allCases.length
  const totalEdges = (project.edges ?? []).length

  const pass = allCases.filter(c => c.status === 'pass').length
  const fail = allCases.filter(c => c.status === 'fail').length
  const skip = allCases.filter(c => c.status === 'skip').length
  const untested = allCases.filter(c => c.status === 'untested').length
  const blocked = allCases.filter(c => c.status === 'blocked').length
  const denom = totalCases - skip
  const passRate = denom > 0 ? Math.round((pass / denom) * 100) : 0

  const perNode = project.flows.map(node => {
    const cases = project.testCases[node.id] ?? []
    const nPass = cases.filter(c => c.status === 'pass').length
    const nFail = cases.filter(c => c.status === 'fail').length
    const nSkip = cases.filter(c => c.status === 'skip').length
    const nTotal = cases.length
    const nDenom = nTotal - nSkip
    const nRate = nDenom > 0 ? Math.round((nPass / nDenom) * 100) : 0
    return { node, total: nTotal, pass: nPass, fail: nFail, skip: nSkip, rate: nRate }
  })

  return (
    <div className="h-full overflow-auto">
      <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
        <Link
          href={`/projects/${projectId}`}
          className="text-xs px-2 py-1 rounded border transition-colors hover:bg-[var(--bg-secondary)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          ← Back
        </Link>
        <h2 className="text-base font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
          {project.name} — Summary
        </h2>
        <button
          onClick={() => setExportOpen(true)}
          className="px-3 py-1.5 text-xs font-medium rounded-md border transition-colors hover:bg-[var(--bg-secondary)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Export
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5">
        <Card label="Flow Nodes" value={totalNodes} />
        <Card label="Test Cases" value={totalCases} />
        <Card label="Pass Rate" value={`${passRate}%`} color="var(--status-pass-text)" />
        <Card label="Conditional Edges" value={totalEdges} />
        <TypeCard
          type={project.type || ''}
          onUpdate={(newType) => updateProject(project.id, p => ({ ...p, type: newType }))}
        />
        <GitHubRepoCard
          repo={project.githubRepo}
          onUpdate={(repo) => updateProject(project.id, p => ({ ...p, githubRepo: repo }))}
        />
      </div>

      <div className="px-5 pb-4">
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Status Breakdown</h3>
        <div className="flex gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>Pass: <strong style={{ color: 'var(--status-pass-text)' }}>{pass}</strong></span>
          <span>Fail: <strong style={{ color: 'var(--status-fail-text)' }}>{fail}</strong></span>
          <span>Skip: <strong style={{ color: 'var(--status-skip-text)' }}>{skip}</strong></span>
          <span>Untested: <strong style={{ color: 'var(--status-untested-text)' }}>{untested}</strong></span>
          <span>Blocked: <strong style={{ color: 'var(--status-blocked-text)' }}>{blocked}</strong></span>
        </div>
      </div>

      {/* Notes section */}
      <div className="px-5 pb-4">
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Notes</h3>
        <div className="relative">
          <textarea
            value={project.notes || ''}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="Add project notes, observations, or documentation..."
            rows={4}
            className="w-full px-3 py-2 text-sm bg-transparent outline-none border resize-none transition-colors focus:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
          />
          {isConnected ? (
            <button
              onClick={handleRefine}
              disabled={refining || !project.notes}
              className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-medium rounded border transition-all hover:bg-[var(--bg-secondary)] disabled:opacity-30 z-10"
              style={{ borderColor: 'var(--border)', color: 'var(--accent)', backgroundColor: 'var(--bg-card)', opacity: refining ? 1 : 0.7 }}
              title="AI will refine your notes to be more structured"
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              {refining ? 'Refining...' : '✦ Refine'}
            </button>
          ) : (
            <button
              disabled
              className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-medium rounded border opacity-30 cursor-not-allowed"
              style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-card)' }}
              title="Configure an LLM provider in Settings to use AI refine"
            >
              ✦ Refine
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pb-4">
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Per-Node Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-1.5 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Code</th>
              <th className="text-left py-1.5 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Node</th>
              <th className="text-right py-1.5 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Cases</th>
              <th className="text-right py-1.5 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Rate</th>
              <th className="py-1.5 w-24 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}></th>
            </tr>
          </thead>
          <tbody>
            {perNode.map(({ node, total, rate }) => (
              <tr key={node.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{node.code || '—'}</td>
                <td className="py-2" style={{ color: 'var(--text-primary)' }}>{node.label}</td>
                <td className="py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{total}</td>
                <td className="py-2 text-right" style={{ color: rate >= 80 ? 'var(--status-pass-text)' : rate >= 50 ? 'var(--status-skip-text)' : 'var(--status-fail-text)' }}>
                  {total > 0 ? `${rate}%` : '—'}
                </td>
                <td className="py-2">
                  {total > 0 && (
                    <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: rate >= 80 ? 'var(--status-pass-text)' : rate >= 50 ? 'var(--status-skip-text)' : 'var(--status-fail-text)' }} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(project.edges ?? []).length > 0 && (
        <div className="px-5 pb-4">
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Conditional Edges</h3>
          <div className="flex flex-col gap-2">
            {(project.edges ?? []).map(edge => {
              const from = project.flows.find(n => n.id === edge.fromId)
              const to = project.flows.find(n => n.id === edge.toId)
              return (
                <div key={edge.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{from?.label ?? '?'}</span>
                  <span style={{ color: edge.type === 'pass' ? 'var(--status-pass-text)' : 'var(--status-fail-text)' }}>
                    {edge.type === 'pass' ? '→ ✓ Pass →' : edge.type === 'fail' ? '→ ✗ Fail →' : '→'}
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{to?.label ?? '?'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} project={project} />
    </div>
  )
}

function Card({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 rounded-md border" style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-md)' }}>
      <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
      <div className="text-lg font-medium" style={{ color: color ?? 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

function TypeCard({ type, onUpdate }: { type: string; onUpdate: (type: string) => void }) {
  const [editing, setEditing] = useState(false)
  return (
    <div className="p-3 rounded-md border" style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-md)' }}>
      <div className="text-xs mb-1 flex items-center justify-between" style={{ color: 'var(--text-tertiary)' }}>
        <span>Project Type</span>
        <button
          onClick={() => setEditing(prev => !prev)}
          className="text-[10px] hover:underline transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <select
          value={type}
          onChange={e => { onUpdate(e.target.value); setEditing(false) }}
          className="w-full px-2 py-1 text-sm rounded border outline-none cursor-pointer"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: type ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
        >
          <option value="">None</option>
          <option value="Dashboard">Dashboard</option>
          <option value="Website">Website</option>
          <option value="Gak Jelas">Gak Jelas</option>
        </select>
      ) : (
        <div className="text-lg font-medium" style={{ color: type ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          {type || 'Not set'}
        </div>
      )}
    </div>
  )
}

function ExportModal({ open, onClose, project }: { open: boolean; onClose: () => void; project: any }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl p-5"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Export Project
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Export &ldquo;{project.name}&rdquo; as:
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { downloadMarkdown(project); onClose() }}
            className="w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Markdown (.md)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Formatted tables for documentation</span>
          </button>
          <button
            onClick={() => { downloadJSON(project); onClose() }}
            className="w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>JSON (.json)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Full data backup</span>
          </button>
          <button
            onClick={() => { downloadCSV(project); onClose() }}
            className="w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>CSV (.csv)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Spreadsheet-compatible format</span>
          </button>
          <button
            onClick={async () => { await downloadXLSX(project); onClose() }}
            className="w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Excel (.xlsx)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Styled spreadsheet with Summary tab</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
