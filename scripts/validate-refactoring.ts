import * as fs from 'fs'
import * as path from 'path'

interface ValidationIssue {
  file: string
  line: number
  type: 'inline-styles' | 'hardcoded-color' | 'legacy-class'
  severity: 'error' | 'warning' | 'info'
  message: string
  context: string
}

interface ValidationReport {
  scannedFiles: number
  totalIssues: number
  errors: number
  warnings: number
  infos: number
  issues: ValidationIssue[]
  summary: {
    [key: string]: number
  }
}

const EXCLUDE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', 'scripts', 'docs']
const INCLUDE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

// Patterns to detect
const HARDCODED_COLORS = [
  /\bslate-\d{2,3}\b/g,
  /\bgray-\d{2,3}\b(?!-)/g, // gray-900 but not --gray-900
  /\bblue-\d{2,3}\b(?!-)/g,
  /\bgreen-\d{2,3}\b(?!-)/g,
  /\bred-\d{2,3}\b(?!-)/g,
  /\byellow-\d{2,3}\b(?!-)/g,
]

const LEGACY_CLASSES = [
  /\bbtn-primary\b/g,
  /\bbtn-secondary\b/g,
  /\bcard-interactive\b/g,
  /\bcard-neon\b/g,
]

// Files that are allowed to have inline styles (dynamic values)
const INLINE_STYLE_WHITELIST = [
  'components/ui/AdminNavBar.tsx',
  'components/ui/InfoPill.tsx',
  'components/ui/CountdownBadge.tsx',
  'components/ui/JobCard.tsx',
  'components/ui/ThemeProvider.tsx',
]

function shouldScanFile(filePath: string): boolean {
  const ext = path.extname(filePath)
  return INCLUDE_EXTENSIONS.includes(ext)
}

function shouldScanDirectory(dirPath: string): boolean {
  const dirName = path.basename(dirPath)
  return !EXCLUDE_DIRS.includes(dirName)
}

function isWhitelisted(filePath: string, type: string): boolean {
  if (type === 'inline-styles') {
    return INLINE_STYLE_WHITELIST.some(whitelisted => filePath.includes(whitelisted))
  }
  return false
}

function countInlineStyles(content: string): number {
  // Count style={{ }} patterns
  const stylePattern = /style=\{\{[^}]+\}\}/g
  const matches = content.match(stylePattern) || []
  return matches.length
}

function scanFile(filePath: string, issues: ValidationIssue[]): void {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const relativeFilePath = path.relative(process.cwd(), filePath)

  lines.forEach((line, lineIndex) => {
    // Check for hardcoded colors
    HARDCODED_COLORS.forEach(pattern => {
      const matches = line.matchAll(pattern)
      for (const match of matches) {
        // Skip if it's a CSS variable (--color-)
        if (line.includes('--' + match[0])) continue

        issues.push({
          file: relativeFilePath,
          line: lineIndex + 1,
          type: 'hardcoded-color',
          severity: 'error',
          message: `Hardcoded color "${match[0]}" should use design token`,
          context: line.trim().substring(0, 100),
        })
      }
    })

    // Check for legacy classes
    LEGACY_CLASSES.forEach(pattern => {
      const matches = line.matchAll(pattern)
      for (const match of matches) {
        issues.push({
          file: relativeFilePath,
          line: lineIndex + 1,
          type: 'legacy-class',
          severity: 'warning',
          message: `Legacy class "${match[0]}" should be migrated to glass-* variant`,
          context: line.trim().substring(0, 100),
        })
      }
    })

    // Check for suspicious inline styles (non-whitelisted files)
    if (!isWhitelisted(relativeFilePath, 'inline-styles')) {
      const styleMatches = line.matchAll(/style=\{\{/g)
      for (const match of styleMatches) {
        // Only warn if it's a large inline style object (likely static)
        const styleContent = line.substring(match.index || 0)
        if (styleContent.length > 50) {
          issues.push({
            file: relativeFilePath,
            line: lineIndex + 1,
            type: 'inline-styles',
            severity: 'info',
            message: 'Large inline style object - consider extracting to component or class',
            context: line.trim().substring(0, 100),
          })
        }
      }
    }
  })

  // Count total inline styles for whitelisted files (info only)
  if (isWhitelisted(relativeFilePath, 'inline-styles')) {
    const count = countInlineStyles(content)
    if (count > 10) {
      issues.push({
        file: relativeFilePath,
        line: 0,
        type: 'inline-styles',
        severity: 'info',
        message: `File has ${count} inline styles (whitelisted but monitor for growth)`,
        context: '',
      })
    }
  }
}

function scanDirectory(dirPath: string, issues: ValidationIssue[]): number {
  let scannedFiles = 0

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory() && shouldScanDirectory(fullPath)) {
        scannedFiles += scanDirectory(fullPath, issues)
      } else if (entry.isFile() && shouldScanFile(fullPath)) {
        scanFile(fullPath, issues)
        scannedFiles++
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error)
  }

  return scannedFiles
}

function generateReport(issues: ValidationIssue[], scannedFiles: number): ValidationReport {
  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const infos = issues.filter(i => i.severity === 'info').length

  const summary: Record<string, number> = {}
  issues.forEach(issue => {
    const key = `${issue.type}-${issue.severity}`
    summary[key] = (summary[key] || 0) + 1
  })

  return {
    scannedFiles,
    totalIssues: issues.length,
    errors,
    warnings,
    infos,
    issues,
    summary,
  }
}

function printReport(report: ValidationReport): void {
  console.log('\n========================================')
  console.log('  REFACTORING VALIDATION REPORT')
  console.log('========================================\n')

  console.log(`Scanned Files: ${report.scannedFiles}`)
  console.log(`Total Issues: ${report.totalIssues}`)
  console.log(`  Errors:   ${report.errors}`)
  console.log(`  Warnings: ${report.warnings}`)
  console.log(`  Info:     ${report.infos}\n`)

  if (report.totalIssues === 0) {
    console.log('✓ No issues found! Refactoring looks good.\n')
    return
  }

  // Group issues by severity
  const errorIssues = report.issues.filter(i => i.severity === 'error')
  const warningIssues = report.issues.filter(i => i.severity === 'warning')
  const infoIssues = report.issues.filter(i => i.severity === 'info')

  // Print errors
  if (errorIssues.length > 0) {
    console.log('❌ ERRORS (must fix):')
    console.log('─────────────────────────────────────')
    errorIssues.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line}`)
      console.log(`    ${issue.message}`)
      if (issue.context) {
        console.log(`    Context: ${issue.context}`)
      }
      console.log()
    })
  }

  // Print warnings
  if (warningIssues.length > 0) {
    console.log('⚠️  WARNINGS (should fix):')
    console.log('─────────────────────────────────────')
    warningIssues.slice(0, 10).forEach(issue => {
      console.log(`  ${issue.file}:${issue.line}`)
      console.log(`    ${issue.message}`)
      console.log()
    })
    if (warningIssues.length > 10) {
      console.log(`  ... and ${warningIssues.length - 10} more warnings\n`)
    }
  }

  // Print info
  if (infoIssues.length > 0) {
    console.log('ℹ️  INFO (monitor):')
    console.log('─────────────────────────────────────')
    infoIssues.slice(0, 5).forEach(issue => {
      console.log(`  ${issue.file}:${issue.line}`)
      console.log(`    ${issue.message}`)
      console.log()
    })
    if (infoIssues.length > 5) {
      console.log(`  ... and ${infoIssues.length - 5} more info items\n`)
    }
  }

  console.log('Summary:')
  console.log('─────────────────────────────────────')
  Object.entries(report.summary).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`)
  })

  console.log('\n========================================')
  console.log(`Full report saved to: refactoring-validation-report.json`)
  console.log('========================================\n')

  if (report.errors > 0) {
    console.log('⚠️  Action required: Fix errors before deploying\n')
    process.exit(1)
  } else if (report.warnings > 0) {
    console.log('ℹ️  Consider fixing warnings for best practices\n')
  } else {
    console.log('✓ Validation passed!\n')
  }
}

// Main execution
function main() {
  console.log('Starting refactoring validation...\n')

  const issues: ValidationIssue[] = []
  const rootDir = process.cwd()

  const scannedFiles = scanDirectory(rootDir, issues)
  const report = generateReport(issues, scannedFiles)

  // Save report to JSON
  fs.writeFileSync(
    path.join(rootDir, 'refactoring-validation-report.json'),
    JSON.stringify(report, null, 2)
  )

  // Print human-readable report
  printReport(report)
}

main()
