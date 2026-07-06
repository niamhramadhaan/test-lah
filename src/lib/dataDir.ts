import os from 'os'
import path from 'path'

// Single resolver for the local persisted-data directory, shared by
// fileStore.ts (state.json) and crypto.ts (auto-generated encryption key) so
// both agree on where "local disk" is for this install.
//
// Deliberately NOT process.cwd()-based: bin/test-lah.js spawns the server
// with cwd set to the package's own installed directory
// (node_modules/@niamhramadhaan/test-lah/.next/standalone), so a cwd-relative
// default would put user data *inside the installed package* — every
// `npm install`/`npm update` deletes and re-extracts that directory, wiping
// (and, worse, replacing with whatever the published tarball happens to
// contain) the user's real data. A per-user home-directory location is
// stable across installs, updates, and Node.js version bumps.
export function getDataDir(): string {
  return process.env.AYU_DATA_DIR ?? path.join(os.homedir(), '.test-lah')
}
