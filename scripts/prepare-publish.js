#!/usr/bin/env node

/**
 * prepare-publish.js
 * 
 * Copies the standalone build to the package root for npm publishing.
 * Run this before `npm publish`.
 */

const fs = require('fs')
const path = require('path')

const rootDir = path.join(__dirname, '..')
const src = path.join(rootDir, '.next', 'standalone')
const dest = path.join(rootDir, 'standalone')

if (!fs.existsSync(path.join(src, 'server.js'))) {
  console.error('Error: Run "npm run build" first to create the standalone server.')
  process.exit(1)
}

// Copy standalone to root
console.log('Copying standalone server...')
fs.cpSync(src, dest, { recursive: true })

// Copy static files
const staticSrc = path.join(rootDir, '.next', 'static')
const staticDest = path.join(dest, '.next', 'static')
if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true })
  fs.cpSync(staticSrc, staticDest, { recursive: true })
  console.log('Copied static assets.')
}

// Copy public folder
const publicSrc = path.join(rootDir, 'public')
const publicDest = path.join(dest, 'public')
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true })
  console.log('Copied public folder.')
}

console.log('Done! Ready to publish with: npm publish')
