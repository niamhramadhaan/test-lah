// Run this yourself: node recover-qa-dashboard.js
// It reads ONLY the local LevelDB log file for Edge's localStorage and writes
// candidate qa-dashboard JSON blobs to ./recovered/ on your own machine.
// Nothing is sent anywhere or shown to the assistant.

const fs = require('fs')
const path = require('path')

const logPath = path.join(
  process.env.LOCALAPPDATA,
  'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb', '026542.log',
)

const buf = fs.readFileSync(logPath)
const needle = Buffer.from('qa-dashboard', 'utf8')

const hits = []
let idx = 0
while (true) {
  idx = buf.indexOf(needle, idx)
  if (idx === -1) break
  hits.push(idx)
  idx += 1
}

const outDir = path.join(__dirname, 'recovered')
fs.mkdirSync(outDir, { recursive: true })

hits.forEach((h, i) => {
  // Grab a generous window after the key — the JSON value follows the key in the record.
  const start = h
  const end = Math.min(buf.length, h + 20000)
  const raw = buf.slice(start, end).toString('latin1')

  // Try to find a JSON object starting at "{"projects"" and balance braces to extract just that object.
  const jsonStart = raw.indexOf('{"projects"')
  let extracted = null
  if (jsonStart !== -1) {
    let depth = 0
    let inString = false
    let escape = false
    for (let p = jsonStart; p < raw.length; p++) {
      const c = raw[p]
      if (escape) { escape = false; continue }
      if (c === '\\') { escape = true; continue }
      if (c === '"') { inString = !inString; continue }
      if (inString) continue
      if (c === '{') depth++
      if (c === '}') {
        depth--
        if (depth === 0) {
          extracted = raw.slice(jsonStart, p + 1)
          break
        }
      }
    }
  }

  const outFile = path.join(outDir, `candidate-${i}-offset-${h}.json`)
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted)
      const projectCount = Object.keys(parsed.projects || {}).length
      fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2))
      console.log(`candidate-${i} (offset ${h}): parsed OK, ${projectCount} project(s) -> ${outFile}`)
    } catch (e) {
      fs.writeFileSync(outFile + '.raw.txt', extracted)
      console.log(`candidate-${i} (offset ${h}): failed to parse as JSON (saved raw) -> ${outFile}.raw.txt`)
    }
  } else {
    console.log(`candidate-${i} (offset ${h}): no JSON object found in window`)
  }
})

console.log('\nDone. Check the ./recovered/ folder — open the .json files and look for the one')
console.log('with the most projects/test cases in it. That\'s your recovery candidate.')
