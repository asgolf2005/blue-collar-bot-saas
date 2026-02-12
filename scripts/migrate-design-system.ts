import * as fs from 'fs'
import * as path from 'path'

interface LegacyUsage {
  file: string
  line: number
  column: number
  legacyClass: string
  modernClass: string
  context: string
}

interface MigrationReport {
  scannedFiles: number
  filesWithLegacyClasses: number
  totalLegacyUsages: number
  usages: LegacyUsage[]
  summary: {
    [key: string]: number
  }
}

// Legacy class mappings
const LEGACY_MAPPINGS: Record<string, string> = {
  'btn-primary': 'glass-btn-primary',
  'btn-secondary': 'glass-btn-secondary',
  'btn-profit': 'glass-btn-profit',
  'btn-danger': 'glass-btn-danger',
  'btn-ghost': 'glass-btn-ghost',
  'btn-neon': 'glass-btn-neon',
  'btn-icon': 'glass-btn-icon',
  'card-interactive': 'glass-card-interactive',
  'card-neon': 'glass-card-neon',
  'card-profit': 'glass-card-profit',
  'card-loss': 'glass-card-danger',
}

// Patterns to detect
const LEGACY_PATTERNS = [
  /\bbtn-primary\b/g,
  /\bbtn-secondary\b/g,
  /\bbtn-profit\b/g,
  /\bbtn-danger\b/g,
  /\bbtn-ghost\b/g,
  /\bbtn-neon\b/g,
  /\bcard-interactive\b/g,
  /\bcard-neon\b/g,
  /\bcard-profit\b/g,
  /\bcard-loss\b/g,
]

const EXCLUDE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', 'docs', 'scripts']
const INCLUDE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

function shouldScanFile(filePath: string): boolean {
  const ext = path.extname(filePath)
  return INCLUDE_EXTENSIONS.includes(ext)
}

function shouldScanDirectory(dirPath: string): boolean {
  const dirName = path.basename(dirPath)
  return !EXCLUDE_DIRS.includes(dirName)
}

function scanFile(filePath: string, usages: LegacyUsage[]): void {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  lines.forEach((line, lineIndex) => {
    LEGACY_PATTERNS.forEach(pattern => {
      const matches = line.matchAll(pattern)
      for (const match of matches) {
        const legacyClass = match[0]
        const modernClass = LEGACY_MAPPINGS[legacyClass] || 'UNKNOWN'
        const column = match.index || 0

        usages.push({
          file: filePath,
          line: lineIndex + 1,
          column: column + 1,
          legacyClass,
          modernClass,
          context: line.trim().substring(0, 100),
        })
      }
    })
  })
}

function scanDirectory(dirPath: string, usages: LegacyUsage[]): number {
  let scannedFiles = 0

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory() && shouldScanDirectory(fullPath)) {
        scannedFiles += scanDirectory(fullPath, usages)
      } else if (entry.isFile() && shouldScanFile(fullPath)) {
        scanFile(fullPath, usages)
        scannedFiles++
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error)
  }

  return scannedFiles
}

function generateReport(usages: LegacyUsage[], scannedFiles: number): MigrationReport {
  const filesWithLegacy = new Set(usages.map(u => u.file)).size
  const summary: Record<string, number> = {}

  usages.forEach(usage => {
    summary[usage.legacyClass] = (summary[usage.legacyClass] || 0) + 1
  })

  return {
    scannedFiles,
    filesWithLegacyClasses: filesWithLegacy,
    totalLegacyUsages: usages.length,
    usages,
    summary,
  }
}

function printReport(report: MigrationReport): void {
  console.log('\n========================================')
  console.log('  DESIGN SYSTEM MIGRATION REPORT')
  console.log('========================================\n')

  console.log(`Scanned Files: ${report.scannedFiles}`)
  console.log(`Files with Legacy Classes: ${report.filesWithLegacyClasses}`)
  console.log(`Total Legacy Usages: ${report.totalLegacyUsages}\n`)

  if (report.totalLegacyUsages === 0) {
    console.log('✓ No legacy classes found! Migration complete.\n')
    return
  }

  console.log('Summary by Class:')
  console.log('─────────────────────────────────────')
  Object.entries(report.summary)
    .sort((a, b) => b[1] - a[1])
    .forEach(([className, count]) => {
      const modern = LEGACY_MAPPINGS[className] || 'UNKNOWN'
      console.log(`  ${className.padEnd(20)} → ${modern.padEnd(25)} (${count} usages)`)
    })

  console.log('\nFiles with Legacy Classes:')
  console.log('─────────────────────────────────────')
  const fileGroups = report.usages.reduce((acc, usage) => {
    if (!acc[usage.file]) {
      acc[usage.file] = []
    }
    acc[usage.file].push(usage)
    return acc
  }, {} as Record<string, LegacyUsage[]>)

  Object.entries(fileGroups).forEach(([file, usages]) => {
    console.log(`\n  ${file} (${usages.length} usages)`)
    usages.forEach(usage => {
      console.log(`    Line ${usage.line}:${usage.column} - ${usage.legacyClass} → ${usage.modernClass}`)
    })
  })

  console.log('\n========================================')
  console.log(`Report saved to: legacy-design-system-report.json`)
  console.log('========================================\n')
}

// Main execution
function main() {
  console.log('Starting design system migration scan...\n')

  const usages: LegacyUsage[] = []
  const rootDir = process.cwd()

  const scannedFiles = scanDirectory(rootDir, usages)
  const report = generateReport(usages, scannedFiles)

  // Save report to JSON
  fs.writeFileSync(
    path.join(rootDir, 'legacy-design-system-report.json'),
    JSON.stringify(report, null, 2)
  )

  // Print human-readable report
  printReport(report)
}

main()
