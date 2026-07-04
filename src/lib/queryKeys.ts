export const queryKeys = {
  state: ['state'] as const,
  llmTest: (provider: string) => ['llm', 'test', provider] as const,
  github: {
    deviceFlow: ['github', 'device-flow'] as const,
    repos: ['github', 'repos'] as const,
    issues: (owner: string, repo: string) => ['github', 'issues', owner, repo] as const,
  },
}
