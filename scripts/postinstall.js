#!/usr/bin/env node

/**
 * postinstall script
 * 
 * Builds the standalone server if not already built.
 * Skips build if standalone/server.js already exists.
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const rootDir = path.join(__dirname, '..')
const serverPath = path.join(rootDir, 'standalone', 'server.js')

// Skip if already built
if (fs.existsSync(serverPath)) {
  console.log('test-lah: Server already built, skipping.')
  process.exit(0)
}

// Skip in development (when node_modules is present and .git exists)
if (fs.existsSync(path.join(rootDir, '.git'))) {
  console.log('test-lah: Development mode detected, skipping postinstall build.')
  console.log('Run "npm run build" manually to build the standalone server.')
  process.exit(0)
}

console.log('test-lah: Building standalone server...')

try {
  execSync('npx next build', {
    cwd: rootDir,
    stdio: 'inherit',
  })
  console.log('test-lah: Build complete!')
} catch (err) {
  console.error('test-lah: Build failed. Run "npm run build" manually.')
  // Don't fail the install — user can build later
  process.exit(0)
}
