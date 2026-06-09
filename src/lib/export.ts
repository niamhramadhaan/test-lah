import { Project, FlowNode, TestCase, Status, DEFAULT_COLUMNS, ColumnConfig } from '@/types'
import ExcelJS from 'exceljs'

const STATUS_LABELS: Record<Status, string> = {
  untested: '⬜ Untested',
  pass: '✅ Pass',
  fail: '❌ Fail',
  skip: '⏭ Skip',
}

const escapeCell = (s: string) => s.replace(/\n/g, '<br>').replace(/\|/g, '\\|')

export function exportAsMarkdown(project: Project): string {
  let md = `# ${project.name}\n\n`

  for (const node of project.flows) {
    const cases = project.testCases[node.id]
    if (!cases || cases.length === 0) continue

    const nodeCols = (project.columnConfigs?.[node.id] ?? project.columnConfig ?? []).length > 0
      ? (project.columnConfigs?.[node.id] ?? project.columnConfig ?? [])
      : DEFAULT_COLUMNS
    const nodeVisibleCols = nodeCols.filter(c => c.visible)
    const header = nodeVisibleCols.map(c => c.label).join(' | ')
    const sep = nodeVisibleCols.map(() => '---').join(' | ')

    md += `## ${node.code ? node.code + ' — ' : ''}${node.label}\n\n`
    md += `| # | ${header} |\n`
    md += `|---|${sep}|\n`

    cases.forEach((tc, i) => {
      const cells = nodeVisibleCols.map(c => {
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

function resolveColumns(columns: ColumnConfig[] | undefined, fallback: ColumnConfig[]): ColumnConfig[] {
  const cols = columns && columns.length > 0 ? columns : fallback
  return cols.length > 0 ? cols : DEFAULT_COLUMNS
}

function buildCellValues(tc: TestCase, cols: ColumnConfig[]): (string)[] {
  return cols.map(c => {
    if (c.key === 'status') return STATUS_LABELS[tc.status]
    return (tc[c.key as keyof typeof tc] as string) || ''
  })
}

function escapeCSV(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportNodeAsCSV(node: FlowNode, testCases: TestCase[], columns: ColumnConfig[]): string {
  const cols = resolveColumns(columns, DEFAULT_COLUMNS)
  const visibleCols = cols.filter(c => c.visible)
  const header = ['#', ...visibleCols.map(c => escapeCSV(c.label))].join(',')
  const rows = testCases.map((tc, i) => {
    const cells = [String(i + 1), ...buildCellValues(tc, visibleCols).map(escapeCSV)]
    return cells.join(',')
  })
  return [header, ...rows].join('\n')
}

export function downloadNodeCSV(node: FlowNode, testCases: TestCase[], columns: ColumnConfig[]) {
  const safeName = (node.code || node.label).replace(/[^a-zA-Z0-9_-]/g, '_')
  downloadFile(exportNodeAsCSV(node, testCases, columns), `${safeName}.csv`, 'text/csv')
}

function resolveNodeCols(project: Project, nodeId: string): ColumnConfig[] {
  const cols = project.columnConfigs?.[nodeId] ?? project.columnConfig ?? []
  return cols.length > 0 ? cols : DEFAULT_COLUMNS
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdbd8d3' } }
  cell.font = { name: 'Inter', bold: true, size: 11 }
  cell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  }
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
}

function applyDataStyle(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  }
  cell.font = { name: 'Inter', size: 11 }
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
}

function buildSheet(workbook: ExcelJS.Workbook, sheetName: string, nodeLabel: string, testCases: TestCase[], visibleCols: ColumnConfig[]) {
  const sheet = workbook.addWorksheet(sheetName)

  sheet.columns = [
    { header: '#', key: 'row', width: 6 },
    ...visibleCols.map(c => ({ header: c.label, key: c.key, width: Math.max(c.label.length + 4, 18) })),
  ]

  const headerRow = sheet.getRow(1)
  headerRow.eachCell(applyHeaderStyle)

  testCases.forEach((tc, i) => {
    const rowData: Record<string, string | number> = { row: i + 1 }
    visibleCols.forEach(c => {
      if (c.key === 'status') {
        rowData[c.key] = STATUS_LABELS[tc.status]
      } else {
        rowData[c.key] = (tc[c.key as keyof typeof tc] as string) || ''
      }
    })
    const row = sheet.addRow(rowData)
    row.eachCell(applyDataStyle)
  })

  return sheet
}

export async function exportNodeAsXLSX(node: FlowNode, testCases: TestCase[], columns: ColumnConfig[]): Promise<Blob> {
  const cols = resolveColumns(columns, DEFAULT_COLUMNS)
  const visibleCols = cols.filter(c => c.visible)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Ayu Management Tools'

  buildSheet(workbook, node.label, node.label, testCases, visibleCols)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function downloadNodeXLSX(node: FlowNode, testCases: TestCase[], columns: ColumnConfig[]) {
  const safeName = (node.code || node.label).replace(/[^a-zA-Z0-9_-]/g, '_')
  const blob = await exportNodeAsXLSX(node, testCases, columns)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportProjectAsXLSX(project: Project): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Ayu Management Tools'

  for (const node of project.flows) {
    const cases = project.testCases[node.id]
    if (!cases || cases.length === 0) continue

    const cols = resolveNodeCols(project, node.id)
    const visibleCols = cols.filter(c => c.visible)
    const sheetName = (node.code || node.label).substring(0, 31).replace(/[\\/*?[\]]/g, '_')
    buildSheet(workbook, sheetName, node.label, cases, visibleCols)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function downloadXLSX(project: Project) {
  const blob = await exportProjectAsXLSX(project)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportProjectAsCSV(project: Project): string {
  let csv = ''
  for (const node of project.flows) {
    const cases = project.testCases[node.id]
    if (!cases || cases.length === 0) continue

    const cols = resolveNodeCols(project, node.id)
    const visibleCols = cols.filter(c => c.visible)

    csv += `# ${node.code ? node.code + ' — ' : ''}${node.label}\n`
    csv += ['#', ...visibleCols.map(c => escapeCSV(c.label))].join(',') + '\n'
    cases.forEach((tc, i) => {
      const cells = [String(i + 1), ...buildCellValues(tc, visibleCols).map(escapeCSV)]
      csv += cells.join(',') + '\n'
    })
    csv += '\n'
  }
  return csv
}

export function downloadCSV(project: Project) {
  downloadFile(exportProjectAsCSV(project), `${project.name}.csv`, 'text/csv')
}
