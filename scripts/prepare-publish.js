#!/usr/bin/env node

/**
 * prepare-publish.js
 * 
 * Copies static and public files into .next/standalone for npm publishing.
 * Run this after `npm run build` and before `npm publish`.
 */

const fs = require('fs')
const path = require('path')

const rootDir = path.join(__dirname, '..')
const standaloneDir = path.join(rootDir, '.next', 'standalone')

if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
  console.error('Error: Run "npm run build" first to create the standalone server.')
  process.exit(1)
}

// Copy static files into .next/standalone/.next/static
const staticSrc = path.join(rootDir, '.next', 'static')
const staticDest = path.join(standaloneDir, '.next', 'static')
if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true })
  fs.cpSync(staticSrc, staticDest, { recursive: true })
  console.log('Copied .next/static → .next/standalone/.next/static')
}

// Copy public folder into .next/standalone/public
const publicSrc = path.join(rootDir, 'public')
const publicDest = path.join(standaloneDir, 'public')
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true })
  console.log('Copied public → .next/standalone/public')
}

// Safety net: a route that Next.js's build treats as static (no dynamic
// request usage) gets *executed* during `next build`, and output file
// tracing will copy any local file it reads straight into this directory.
// That previously leaked a maintainer's real .ayu-data/state.json into the
// published tarball (package.json's "files" ships all of .next/standalone/**).
// /api/state now forces dynamic rendering to prevent this, but this check
// stays as a hard guard against the same class of leak recurring.
for (const leak of ['.ayu-data', 'encryption.key']) {
  const leakPath = path.join(standaloneDir, leak)
  if (fs.existsSync(leakPath)) {
    console.error(`Error: ${leakPath} exists inside the standalone build output.`)
    console.error('This would publish local data to npm. Refusing to continue — delete it and investigate why a route read/wrote it at build time.')
    process.exit(1)
  }
}

console.log('Done! Ready to publish with: npm run publish:npm')
