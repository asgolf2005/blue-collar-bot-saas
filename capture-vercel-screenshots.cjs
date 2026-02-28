const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

function loadDotEnvLocalIfNeeded() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const [key, ...rest] = line.split('=')
    if (!key || rest.length === 0) continue

    if (!process.env[key]) {
      process.env[key] = rest.join('=').trim().replace(/^"(.*)"$/, '$1')
    }
  }
}

loadDotEnvLocalIfNeeded()

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'https://blue-collar-bot-saas.vercel.app'
const ARTIFACT_DIR = path.resolve(
  process.cwd(),
  process.env.SCREENSHOT_OUTPUT_DIR || 'artifacts/screenshots/admin-desktop'
)
const ADMIN_EMAIL = process.env.SCREENSHOT_ADMIN_EMAIL || process.env.E2E_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.SCREENSHOT_ADMIN_PASSWORD || process.env.E2E_ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    'Missing admin credentials. Set SCREENSHOT_ADMIN_EMAIL and SCREENSHOT_ADMIN_PASSWORD (or E2E_ADMIN_*).'
  )
  process.exit(1)
}

const ROUTES = [
  { path: '/admin', name: 'admin_dashboard_full', waitMs: 2200 },
  { path: '/admin/jobs', name: 'admin_jobs_full', waitMs: 2200 },
  { path: '/admin/schedule', name: 'admin_schedule_full', waitMs: 2200 },
  { path: '/admin/customers', name: 'admin_customers_full', waitMs: 1800 },
  { path: '/admin/technicians', name: 'admin_technicians_full', waitMs: 1800 },
  { path: '/admin/analytics', name: 'admin_analytics_full', waitMs: 2400 },
  { path: '/admin/analytics/forecast', name: 'admin_forecast_full', waitMs: 2200 },
  { path: '/admin/billing', name: 'admin_billing_full', waitMs: 1800 },
]

async function captureScreenshots() {
  console.log(`Launching desktop capture for ${BASE_URL}...`)
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 2,
  })

  const page = await context.newPage()

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]')
  await page.fill('input[type="email"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)
  await page.press('input[type="password"]', 'Enter')
  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 30000 })

  for (const route of ROUTES) {
    console.log(`Capturing ${route.path}...`)
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(route.waitMs)

    const screenshotPath = path.join(ARTIFACT_DIR, `${route.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
  }

  await browser.close()
  console.log(`Saved admin desktop screenshots to ${ARTIFACT_DIR}`)
}

captureScreenshots().catch((error) => {
  console.error('Failed to capture admin desktop screenshots:', error)
  process.exit(1)
})
