import { NextRequest, NextResponse } from 'next/server'
import { listOrgs, listOrgRepos, listRepos, type GitHubRepoSummary } from '@/lib/github/client'
import { decrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }
    const decrypted = decrypt(token)

    const [ownRepos, orgs] = await Promise.all([
      listRepos(decrypted),
      listOrgs(decrypted),
    ])

    const orgRepoLists = await Promise.all(orgs.map(org => listOrgRepos(decrypted, org.login)))

    const byFullName = new Map<string, GitHubRepoSummary>()
    for (const repo of [...ownRepos, ...orgRepoLists.flat()]) {
      byFullName.set(repo.fullName, repo)
    }

    return NextResponse.json({ repos: Array.from(byFullName.values()) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
