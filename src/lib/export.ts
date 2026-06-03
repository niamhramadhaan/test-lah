import { Project, FlowNode, TestCase, Status, DEFAULT_COLUMNS } from '@/types'

const STATUS_LABELS: Record<Status, string> = {
  untested: '⬜ Untested',
  pass: '✅ Pass',
  fail: '❌ Fail',
  skip: '⏭ Skip',
}

const escapeCell = (s: string) => s.replace(/\n/g, '<br>').replace(/\|/g, '\\|')

export function exportAsMarkdown(project: Project): string {
  const cols = project.columnConfig.length > 0 ? project.columnConfig : DEFAULT_COLUMNS
  const visibleCols = cols.filter(c => c.visible)
  const header = visibleCols.map(c => c.label).join(' | ')
  const sep = visibleCols.map(() => '---').join(' | ')

  let md = `# ${project.name}\n\n`

  for (const node of project.flows) {
    const cases = project.testCases[node.id]
    if (!cases || cases.length === 0) continue

    md += `## ${node.code ? node.code + ' — ' : ''}${node.label}\n\n`
    md += `| # | ${header} |\n`
    md += `|---|${sep}|\n`

    cases.forEach((tc, i) => {
      const cells = visibleCols.map(c => {
        if (c.key === 'status') return STATUS_LABELS[tc.status]
        return escapeCell((tc[c.key as keyof typeof tc] as string) || '')
      })
      md += `| ${i + 1} | ${cells.join(' | ')} |\n`
    })

    const total = cases.length
    const skipCount = cases.filter(c => c.status === 'skip').length
    const passCount = cases.filter(c => c.status === 'pass').length
    const passRate = total - skipCount > 0 ? Math.round((passCount / (total - skipCount)) * 100) : 0
    md += `\n**Pass rate: ${passCount}/${total - skipCount} (${passRate}%)**\n\n---\n\n`
  }

  return md
}

export function exportAsJSON(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function exportNodeAsMarkdown(node: FlowNode, testCases: TestCase[], columns: typeof DEFAULT_COLUMNS): string {
  const cols = columns.length > 0 ? columns : DEFAULT_COLUMNS
  const visibleCols = cols.filter(c => c.visible)
  const header = visibleCols.map(c => c.label).join(' | ')
  const sep = visibleCols.map(() => '---').join(' | ')

  let md = `# ${node.code ? node.code + ' — ' : ''}${node.label}\n\n`
  md += `| # | ${header} |\n`
  md += `|---|${sep}|\n`

  testCases.forEach((tc, i) => {
    const cells = visibleCols.map(c => {
      if (c.key === 'status') return STATUS_LABELS[tc.status]
      return escapeCell((tc[c.key as keyof typeof tc] as string) || '')
    })
    md += `| ${i + 1} | ${cells.join(' | ')} |\n`
  })

  const total = testCases.length
  const skipCount = testCases.filter(c => c.status === 'skip').length
  const passCount = testCases.filter(c => c.status === 'pass').length
  const passRate = total - skipCount > 0 ? Math.round((passCount / (total - skipCount)) * 100) : 0
  md += `\n**Pass rate: ${passCount}/${total - skipCount} (${passRate}%)**\n`

  return md
}

export function exportNodeAsJSON(node: FlowNode, testCases: TestCase[]): string {
  return JSON.stringify({ node, testCases }, null, 2)
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadMarkdown(project: Project) {
  downloadFile(exportAsMarkdown(project), `${project.name}.md`, 'text/markdown')
}

export function downloadJSON(project: Project) {
  downloadFile(exportAsJSON(project), `${project.name}.json`, 'application/json')
}

export function downloadNodeMarkdown(node: FlowNode, testCases: TestCase[], columns: typeof DEFAULT_COLUMNS) {
  const safeName = (node.code || node.label).replace(/[^a-zA-Z0-9_-]/g, '_')
  downloadFile(exportNodeAsMarkdown(node, testCases, columns), `${safeName}.md`, 'text/markdown')
}

export function downloadNodeJSON(node: FlowNode, testCases: TestCase[]) {
  const safeName = (node.code || node.label).replace(/[^a-zA-Z0-9_-]/g, '_')
  downloadFile(exportNodeAsJSON(node, testCases), `${safeName}.json`, 'application/json')
}
