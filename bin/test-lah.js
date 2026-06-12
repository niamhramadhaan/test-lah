#!/usr/bin/env node

/**
 * test-lah CLI
 * 
 * Starts the test-lah server and opens the browser.
 * 
 * Usage:
 *   test-lah              Start on default port 3000
 *   test-lah --port 8080  Start on custom port
 *   test-lah --no-open    Start without opening browser
 */

const { execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')

// Parse args
const args = process.argv.slice(2)
let port = 3000
let openBrowser = true

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10)
    i++
  }
  if (args[i] === '--no-open') {
    openBrowser = false
  }
  if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
test-lah — QA Test Case Management

Usage:
  test-lah [options]

Options:
  --port <port>   Server port (default: 3000)
  --no-open       Don't open browser automatically
  -h, --help      Show this help
`)
    process.exit(0)
  }
}

// Find the standalone server
// In development: .next/standalone
// In npm global: ../standalone (relative to bin/)
const devStandaloneDir = path.join(__dirname, '..', '.next', 'standalone')
const globalStandaloneDir = path.join(__dirname, '..', 'standalone')

let standaloneDir
if (fs.existsSync(path.join(devStandaloneDir, 'server.js'))) {
  standaloneDir = devStandaloneDir
} else if (fs.existsSync(path.join(globalStandaloneDir, 'server.js'))) {
  standaloneDir = globalStandaloneDir
} else {
  standaloneDir = devStandaloneDir // fallback for error message
}

const serverPath = path.join(standaloneDir, 'server.js')

if (!fs.existsSync(serverPath)) {
  console.error('\x1b[31mError: Server not built yet.\x1b[0m')
  console.error('Run the following to build first:')
  console.error('  cd ' + path.dirname(__dirname) + ' && npm run build')
  process.exit(1)
}

// Check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer()
    server.listen(port, () => {
      server.close(() => resolve(true))
    })
    server.on('error', () => resolve(false))
  })
}

// Open browser cross-platform
function openUrl(url) {
  const platform = process.platform
  try {
    if (platform === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' })
    else if (platform === 'win32') execSync(`start "${url}"`, { stdio: 'ignore' })
    else execSync(`xdg-open "${url}"`, { stdio: 'ignore' })
  } catch {
    // Silently fail — user can open manually
  }
}

async function main() {
  // Find available port
  while (!(await checkPort(port))) {
    console.log(`Port ${port} in use, trying ${port + 1}...`)
    port++
  }

  const url = `http://localhost:${port}`

  console.log(`
\x1b[36m╔══════════════════════════════════════╗
║          test-lah v1.0.0             ║
║    QA Test Case Management           ║
╚══════════════════════════════════════╝\x1b[0m

  Server: \x1b[32m${url}\x1b[0m
  Press Ctrl+C to stop
`)

  // Set environment
  process.env.PORT = String(port)
  process.env.HOSTNAME = '0.0.0.0'

  // Start server
  const server = spawn('node', [serverPath], {
    cwd: standaloneDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env },
  })

  let started = false

  server.stdout.on('data', (data) => {
    const output = data.toString()
    process.stdout.write(output)
    
    // Detect when server is ready
    if (!started && (output.includes('Ready') || output.includes('localhost') || output.includes(port))) {
      started = true
      if (openBrowser) {
        setTimeout(() => openUrl(url), 500)
      }
    }
  })

  server.stderr.on('data', (data) => {
    process.stderr.write(data)
  })

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n\x1b[33mShutting down...\x1b[0m')
    server.kill('SIGTERM')
    setTimeout(() => process.exit(0), 1000)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  server.on('close', (code) => {
    process.exit(code || 0)
  })
}

main().catch((err) => {
  console.error('Failed to start:', err.message)
  process.exit(1)
})
