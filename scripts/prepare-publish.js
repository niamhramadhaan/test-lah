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

console.log('Done! Ready to publish with: npm run publish:npm')
