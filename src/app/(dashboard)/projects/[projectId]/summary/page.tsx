'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useDashboard } from '@/context/DashboardContext'
import { downloadMarkdown, downloadJSON } from '@/lib/export'

export default function SummaryPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { projects } = useDashboard()
  const project = projects[projectId]
  const [exportOpen, setExportOpen] = useState(false)

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
      </div>

      <div className="px-5 pb-4">
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Status Breakdown</h3>
        <div className="flex gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>Pass: <strong style={{ color: 'var(--status-pass-text)' }}>{pass}</strong></span>
          <span>Fail: <strong style={{ color: 'var(--status-fail-text)' }}>{fail}</strong></span>
          <span>Skip: <strong style={{ color: 'var(--status-skip-text)' }}>{skip}</strong></span>
          <span>Untested: <strong style={{ color: 'var(--status-untested-text)' }}>{untested}</strong></span>
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
                    {edge.type === 'pass' ? '→ ✓ Pass →' : '→ ✗ Fail →'}
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
