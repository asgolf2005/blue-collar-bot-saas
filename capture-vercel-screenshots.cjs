const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\asgol\\.gemini\\antigravity\\brain\\1e7d1684-50ef-49db-b0c4-172525cf6646';

async function captureScreenshots() {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2, // Retina quality for crisp screenshots
    });

    const page = await context.newPage();

    console.log('Navigating to login...');
    await page.goto('https://blue-collar-bot-saas.vercel.app/login');

    console.log('Waiting for email input...');
    await page.waitForSelector('input[type="email"]');
    console.log('Filling credentials...');
    await page.fill('input[type="email"]', 'huyenthaai@gmail.com');
    await page.fill('input[type="password"]', 'AdminTest!12345');

    console.log('Submitting login...');
    await page.press('input[type="password"]', 'Enter');

    console.log('Waiting for login to complete...');
    // Wait for the admin dashboard to load by waiting for the URL to change to /admin or a timeout
    await page.waitForURL('**/admin', { timeout: 10000 }).catch(() => console.log('Timeout waiting for /admin URL, continuing anyway...'));
    await page.waitForTimeout(3000); // extra buffer for the dashboard to finish initial fetch

    const routes = [
        { path: '/admin', name: 'vercel_admin_dashboard_full' },
        { path: '/admin/jobs', name: 'vercel_admin_jobs_full' },
        { path: '/admin/schedule', name: 'vercel_admin_schedule_full' },
        { path: '/admin/customers', name: 'vercel_admin_customers_full' },
        { path: '/admin/technicians', name: 'vercel_admin_technicians_full' },
        { path: '/admin/analytics', name: 'vercel_admin_analytics_full' },
    ];

    for (const route of routes) {
        console.log(`Navigating to ${route.path}...`);
        await page.goto(`https://blue-collar-bot-saas.vercel.app${route.path}`, { waitUntil: 'networkidle' });

        // Wait for glassmorphism, framer-motion animations, and realtime data to settle
        await page.waitForTimeout(5000);

        const screenshotPath = path.join(ARTIFACT_DIR, `${route.name}.png`);
        console.log(`Capturing full page screenshot: ${route.name}.png ...`);
        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });
    }

    console.log('All screenshots captured successfully!');
    await browser.close();
}

captureScreenshots().catch(console.error);
