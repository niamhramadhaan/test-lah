const GITHUB_API = 'https://api.github.com'

export interface GitHubIssueSummary {
  number: number
  title: string
  url: string
  state: 'open' | 'closed'
  body: string | null
  updatedAt: string
}

export interface GitHubRepoSummary {
  owner: string
  repo: string
  fullName: string
  private: boolean
}

interface GitHubOrg {
  login: string
}

async function githubRequest(path: string, token: string): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    throw new Error('GitHub API rate limit exceeded, try again later.')
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('GitHub authentication failed or token lacks required permissions.')
  }
  if (res.status === 404) {
    throw new Error('Repository or resource not found or not accessible with this token.')
  }
  const body = await res.json().catch(() => null)
  throw new Error(body?.message || `GitHub API request failed with status ${res.status}`)
}

export async function fetchAuthenticatedUser(token: string): Promise<{ login: string }> {
  const res = await githubRequest('/user', token)
  await throwIfNotOk(res)
  const data = await res.json()
  return { login: data.login }
}

export async function listOrgs(token: string): Promise<GitHubOrg[]> {
  const res = await githubRequest('/user/orgs?per_page=100', token)
  await throwIfNotOk(res)
  const data = await res.json()
  return data.map((org: { login: string }) => ({ login: org.login }))
}

function toRepoSummary(repo: { owner: { login: string }; name: string; full_name: string; private: boolean }): GitHubRepoSummary {
  return { owner: repo.owner.login, repo: repo.name, fullName: repo.full_name, private: repo.private }
}

export async function listRepos(token: string): Promise<GitHubRepoSummary[]> {
  const res = await githubRequest('/user/repos?per_page=100&affiliation=owner,collaborator,organization_member', token)
  await throwIfNotOk(res)
  const data = await res.json()
  return data.map(toRepoSummary)
}

export async function listOrgRepos(token: string, org: string): Promise<GitHubRepoSummary[]> {
  const res = await githubRequest(`/orgs/${encodeURIComponent(org)}/repos?per_page=100`, token)
  await throwIfNotOk(res)
  const data = await res.json()
  return data.map(toRepoSummary)
}

interface RawGitHubIssue {
  number: number
  title: string
  html_url: string
  state: string
  body: string | null
  updated_at: string
  pull_request?: unknown
}

function toIssueSummary(issue: RawGitHubIssue): GitHubIssueSummary {
  return {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    state: issue.state === 'closed' ? 'closed' : 'open',
    body: issue.body,
    updatedAt: issue.updated_at,
  }
}

export async function listIssues(
  token: string,
  owner: string,
  repo: string,
  opts: { state?: 'open' | 'closed' | 'all'; q?: string; page?: number } = {},
): Promise<{ issues: GitHubIssueSummary[]; hasMore: boolean }> {
  const page = opts.page ?? 1
  const perPage = 30

  if (opts.q?.trim()) {
    const query = `repo:${owner}/${repo}+is:issue+${encodeURIComponent(opts.q.trim())}`
    const res = await githubRequest(`/search/issues?q=${query}&per_page=${perPage}&page=${page}`, token)
    await throwIfNotOk(res)
    const data: { items: RawGitHubIssue[]; total_count?: number } = await res.json()
    const items = (data.items ?? []).filter(item => !item.pull_request)
    return { issues: items.map(toIssueSummary), hasMore: page * perPage < (data.total_count ?? 0) }
  }

  const state = opts.state ?? 'open'
  const res = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=${state}&per_page=${perPage}&page=${page}`,
    token,
  )
  await throwIfNotOk(res)
  const data: RawGitHubIssue[] = await res.json()
  const issues = data.filter(item => !item.pull_request)
  return { issues: issues.map(toIssueSummary), hasMore: data.length === perPage }
}

export async function getIssue(token: string, owner: string, repo: string, number: number): Promise<GitHubIssueSummary> {
  const res = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`, token)
  await throwIfNotOk(res)
  const data = await res.json()
  return toIssueSummary(data)
}
