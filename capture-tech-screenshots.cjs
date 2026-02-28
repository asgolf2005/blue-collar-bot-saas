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

const BASE_URL = process.env.SCREENSHOT_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3000'
const ARTIFACT_DIR = path.resolve(
  process.cwd(),
  process.env.SCREENSHOT_OUTPUT_DIR || 'artifacts/screenshots/tech'
)
const TECH_EMAIL = process.env.SCREENSHOT_TECH_EMAIL || process.env.E2E_TECH_EMAIL || 'e2e.tech@example.com'
const TECH_PASSWORD = process.env.SCREENSHOT_TECH_PASSWORD || process.env.E2E_TECH_PASSWORD || 'E2E-Tech-12345!'

const ROUTES = [
  { path: '/tech/today', name: 'tech_today' },
  { path: '/tech/schedule', name: 'tech_schedule' },
  { path: '/tech/dashboard', name: 'tech_dashboard' },
  { path: '/tech/stats', name: 'tech_stats' },
]

async function captureTechScreenshots() {
  console.log(`Launching browser for ${BASE_URL}...`)
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  })

  const page = await context.newPage()

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]')

  await page.getByRole('button', { name: /tech/i }).click()
  await page.fill('input[type="email"]', TECH_EMAIL)
  await page.fill('input[type="password"]', TECH_PASSWORD)
  await page.press('input[type="password"]', 'Enter')
  await page.waitForURL(/\/tech\//, { timeout: 30000 })

  for (const route of ROUTES) {
    console.log(`Capturing ${route.path}...`)
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    const screenshotPath = path.join(ARTIFACT_DIR, `${route.name}.png`)
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    })
  }

  await browser.close()
  console.log(`Saved tech screenshots to ${ARTIFACT_DIR}`)
}

captureTechScreenshots().catch((error) => {
  console.error('Failed to capture tech screenshots:', error)
  process.exit(1)
})
