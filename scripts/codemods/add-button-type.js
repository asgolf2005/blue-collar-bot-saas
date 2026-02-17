/**
 * Codemod: add type="button" to <button> tags that:
 * - have an onClick handler
 * - do not already specify a type=
 *
 * Why: buttons inside (or accidentally under) <form> default to type="submit"
 * which can cause full page refresh / navigation.
 */

const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const TARGET_DIRS = ['app', 'components']
const EXT_RE = /\.(tsx|jsx)$/i

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === 'supabase') continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, out)
    else if (ent.isFile() && EXT_RE.test(ent.name)) out.push(full)
  }
}

function transform(content) {
  let changed = false

  // Match opening <button ...> tags (non-greedy until first '>').
  const out = content.replace(/<button\b([\s\S]*?)>/g, (m, attrs) => {
    if (!/onClick\s*=/.test(attrs)) return m
    if (/\stype\s*=/.test(attrs)) return m

    changed = true
    return `<button type="button"${attrs}>`
  })

  return { out, changed }
}

function main() {
  const files = []
  for (const d of TARGET_DIRS) {
    const abs = path.join(ROOT, d)
    if (fs.existsSync(abs)) walk(abs, files)
  }

  let touched = 0
  let edits = 0

  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8')
    const { out, changed } = transform(before)
    if (!changed) continue
    touched++
    if (out !== before) {
      fs.writeFileSync(file, out, 'utf8')
      edits++
    }
  }

  console.log(`Scanned ${files.length} files.`)
  console.log(`Touched ${touched} files.`)
  console.log(`Wrote ${edits} files.`)
}

main()
