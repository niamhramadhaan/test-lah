import { NextRequest } from 'next/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { readState, updateProject } from '@/lib/store/fileStore'
import * as mutations from '@/lib/mutations/testCases'
import { getProviderDef } from '@/lib/llm/providers'
import { generateTestCases } from '@/lib/llm/index'
import type { TestCase } from '@/types'

function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

function jsonResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function requireProject(projectId: string) {
  const state = readState()
  const project = state.projects[projectId]
  if (!project) throw new Error(`Project not found: ${projectId}`)
  return project
}

function buildServer(): McpServer {
  const server = new McpServer({ name: 'ayu-management-tools', version: '1.0.0' })

  server.registerTool(
    'list_projects',
    {
      title: 'List Projects',
      description: 'List all projects in the QA dashboard (id, name, type, createdAt).',
    },
    async () => {
      const state = readState()
      const projects = Object.values(state.projects).map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        createdAt: p.createdAt,
      }))
      return jsonResult(projects)
    },
  )

  server.registerTool(
    'get_project',
    {
      title: 'Get Project',
      description: 'Get a full project including its nodes (flows) and all test cases, keyed by node id.',
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      try {
        return jsonResult(requireProject(projectId))
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : 'Failed to get project')
      }
    },
  )

  server.registerTool(
    'list_nodes',
    {
      title: 'List Nodes',
      description: 'List the mindmap nodes of a project — id, code, label, parentId.',
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      try {
        const project = requireProject(projectId)
        const nodes = project.flows.map(n => ({ id: n.id, code: n.code, label: n.label, parentId: n.parentId }))
        return jsonResult(nodes)
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : 'Failed to list nodes')
      }
    },
  )

  server.registerTool(
    'get_node',
    {
      title: 'Get Node',
      description: 'Get a single node plus its test cases.',
      inputSchema: { projectId: z.string(), nodeId: z.string() },
    },
    async ({ projectId, nodeId }) => {
      try {
        const project = requireProject(projectId)
        const node = project.flows.find(n => n.id === nodeId)
        if (!node) return errorResult(`Node not found: ${nodeId}`)
        return jsonResult({ node, testCases: project.testCases[nodeId] ?? [] })
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : 'Failed to get node')
      }
    },
  )

  server.registerTool(
    'add_test_case',
    {
      title: 'Add Test Case',
      description: 'Add a new test case to a node.',
      inputSchema: {
        projectId: z.string(),
        nodeId: z.string(),
        title: z.string(),
        steps: z.string().optional(),
        expected: z.string().optional(),
      },
    },
    async ({ projectId, nodeId, title, steps, expected }) => {
      try {
        let created: TestCase | undefined
        await updateProject(projectId, p => {
          const result = mutations.addTestCase(p, nodeId, title, steps, expected)
          created = result.testCase
          return result.project
        })
        return jsonResult(created)
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : 'Failed to add test case')
      }
    },
  )

  server.registerTool(
    'update_test_case',
    {
      title: 'Update Test Case',
      description: 'Update fields of an existing test case (title, steps, expected, status, case_type, notes, links).',
      inputSchema: {
        projectId: z.string(),
        nodeId: z.string(),
        tcId: z.string(),
        patch: z.record(z.string(), z.unknown()),
      },
    },
    async ({ projectId, nodeId, tcId, patch }) => {
      try {
        const updated = await updateProject(projectId, p =>
          mutations.updateTestCase(p, nodeId, tcId, patch as Partial<TestCase>),
        )
        const tc = updated.testCases[nodeId]?.find(t => t.id === tcId) ?? null
        return jsonResult(tc)
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : 'Failed to update test case')
      }
    },
  )

  server.registerTool(
    'delete_test_case',
    {
      title: 'Delete Test Case',
      description: 'Delete a test case from a node.',
      inputSchema: { projectId: z.string(), nodeId: z.string(), tcId: z.string() },
    },
    async ({ projectId, nodeId, tcId }) => {
      try {
        await updateProject(projectId, p => mutations.deleteTestCase(p, nodeId, tcId))
        return jsonResult({ ok: true })
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : 'Failed to delete test case')
      }
    },
  )

  server.registerTool(
    'generate_test_cases',
    {
      title: 'Generate Test Cases (BYO provider key)',
      description:
        'Generate test cases via a pay-per-token LLM provider (OpenAI/Google/Anthropic/etc.) using a caller-supplied API key. ' +
        'For subscription-based Claude usage, prefer reading context via get_node and writing results via add_test_case directly instead of this tool.',
      inputSchema: {
        projectId: z.string().optional(),
        nodeId: z.string().optional(),
        title: z.string(),
        prompt: z.string().optional(),
        language: z.string().optional(),
        provider: z.string(),
        apiKey: z.string(),
        model: z.string().optional(),
        baseURL: z.string().optional(),
      },
    },
    async ({ projectId, nodeId, title, prompt, language, provider, apiKey, model, baseURL }) => {
      try {
        let projectName: string | undefined
        let projectType: string | undefined
        let projectNotes: string | undefined
        let nodeNotes: string | undefined
        let githubIssuesContext: string | undefined

        if (projectId) {
          const project = requireProject(projectId)
          projectName = project.name
          projectType = project.type
          projectNotes = project.notes
          if (nodeId) {
            const node = project.flows.find(n => n.id === nodeId)
            nodeNotes = node?.notes
            if (node?.linkedIssues && node.linkedIssues.length > 0) {
              githubIssuesContext = node.linkedIssues
                .map(issue => `#${issue.number} [${issue.state}] ${issue.title}${issue.body ? `\n${issue.body}` : ''}`)
                .join('\n\n')
            }
          }
        }

        const def = getProviderDef(provider)
        const generated = await generateTestCases(
          { def, apiKey, model: model || '', baseURL },
          { title, prompt: prompt ?? '', language: language ?? 'en', projectName, projectType, projectNotes, nodeNotes, githubIssuesContext },
        )

        if (projectId && nodeId) {
          const created: TestCase[] = []
          await updateProject(projectId, p => {
            let proj = p
            for (const tc of generated) {
              const result = mutations.addTestCase(proj, nodeId, tc.title, tc.steps, tc.expected)
              proj = result.project
              created.push(result.testCase)
            }
            return proj
          })
          return jsonResult(created)
        }

        return jsonResult(generated)
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : 'Failed to generate test cases')
      }
    },
  )

  return server
}

async function handleMcpRequest(req: NextRequest): Promise<Response> {
  const server = buildServer()
  // Stateless mode: every request gets a fresh server + transport, since every
  // tool call re-reads the shared file store — no session state to preserve.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(req)
}

export { handleMcpRequest as GET, handleMcpRequest as POST, handleMcpRequest as DELETE }
