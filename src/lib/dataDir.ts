import path from 'path'

// Single resolver for the local persisted-data directory, shared by
// fileStore.ts (state.json) and crypto.ts (auto-generated encryption key) so
// both agree on where "local disk" is for this install.
export function getDataDir(): string {
  return process.env.AYU_DATA_DIR ?? path.join(process.cwd(), '.ayu-data')
}
