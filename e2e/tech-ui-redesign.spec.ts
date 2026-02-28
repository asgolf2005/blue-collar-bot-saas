import { test, expect } from '@playwright/test';


const iphone14Pro = {
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
};

test.use(iphone14Pro);
test.setTimeout(180000);

const baseUrl = process.env.E2E_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const techEmail = process.env.E2E_TECH_EMAIL || 'e2e.tech@example.com';
const techPassword = process.env.E2E_TECH_PASSWORD || 'E2E-Tech-12345!';

test('capture new tech ui redesigns', async ({ page }) => {
    // 1. Authenticate
    await page.goto(`${baseUrl}/login`);
    await page.waitForTimeout(1000);

    // Select Tech Role
    await page.getByRole('button', { name: /tech/i }).click({ force: true });
    await page.waitForTimeout(500);

    // Fill credentials
    await page.getByPlaceholder('you@company.com').fill(techEmail);
    await page.getByPlaceholder('Enter your password').fill(techPassword);

    // Click Enter Workspace and bypass Navigation wait
    await page.getByRole('button', { name: /enter workspace/i }).click({ force: true });

    try {
        await page.waitForURL(/\/tech\/today(?:\?|$)/, { timeout: 15000 });
    } catch (error) {
        await page.screenshot({ path: 'artifacts/debug_post_login.png', fullPage: true });
        const loginFeedback = (await page.locator('text=Invalid login credentials').first().textContent().catch(() => null))
            || (await page.locator('text=No role is configured for this account.').first().textContent().catch(() => null))
            || (await page.locator('text=This account is registered as').first().textContent().catch(() => null))
            || 'Unknown login failure';
        throw new Error(`Tech login failed for ${techEmail}: ${loginFeedback}`);
    }

    await expect(page.getByText('Tech Command')).toBeVisible({ timeout: 10000 });
    await page.goto(`${baseUrl}/tech/today`);
    await page.waitForTimeout(1500); // Wait for animations
    await page.screenshot({ path: 'artifacts/tech_dashboard_2026_redesign.png', fullPage: false });

    // 3. Capture Tech Schedule
    await page.goto(`${baseUrl}/tech/schedule`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000); // Allow calendar to mount
    await page.screenshot({ path: 'artifacts/tech_schedule_2026_redesign.png', fullPage: false });

    // 4. Capture Tech Stats
    await page.goto(`${baseUrl}/tech/stats`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'artifacts/tech_stats_2026_redesign.png', fullPage: false });

    // 5. Capture Tech Job Details (Assuming job ID 1 exists for seed tech user)
    // Let's first quickly find a job ID from the schedule page instead of hardcoding
    await page.goto(`${baseUrl}/tech/schedule`, { waitUntil: 'domcontentloaded' });
    const jobLink = await page.locator('a[href^="/tech/jobs/"]').first().getAttribute('href');

    if (jobLink) {
        await page.goto(`${baseUrl}${jobLink}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'artifacts/tech_job_details_2026_redesign.png', fullPage: false });
    } else {
        console.log("No job found on the schedule to screenshot details for.");
    }

});
