import { test, expect } from '@playwright/test';

// Helper: Login as admin
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@proplumbing.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
}

test.describe('Admin UI Hardening', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('/admin/jobs', () => {
    test('pipeline board loads without errors', async ({ page }) => {
      await page.goto('/admin/jobs');
      await expect(page.locator('[data-testid="pipeline-board"]')).toBeVisible();
    });

    test('hovering card only highlights one card', async ({ page }) => {
      await page.goto('/admin/jobs');
      const firstCard = page.locator('[data-testid="job-card"]').first();
      await firstCard.hover();
      // Verify only one card has hover class
      const hoveredCards = page.locator('.hover\\:shadow-lg');
      await expect(hoveredCards).toHaveCount(1);
    });

    test('AI dispatch button is visible', async ({ page }) => {
      await page.goto('/admin/jobs');
      await expect(page.locator('[data-testid="ai-dispatch-button"]')).toBeVisible();
    });

    test('Recent Updates uses neutral cards', async ({ page }) => {
      await page.goto('/admin/jobs');
      const updatesPanel = page.locator('[data-testid="recent-updates"]');
      await expect(updatesPanel).toBeVisible();
      // Check no red/yellow backgrounds
      const riskCards = updatesPanel.locator('.bg-rose-100, .bg-amber-100, .bg-red-50, .bg-yellow-50');
      await expect(riskCards).toHaveCount(0);
    });
  });

  test.describe('/admin/schedule', () => {
    test('calendar loads with controls', async ({ page }) => {
      await page.goto('/admin/schedule');
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-rail"]')).toBeVisible();
    });

    test('Jump popover appears above panels', async ({ page }) => {
      await page.goto('/admin/schedule');
      await page.click('[data-testid="jump-button"]');
      const popover = page.locator('[data-testid="jump-popover"]');
      await expect(popover).toBeVisible();
      // Verify z-index by checking it's above other elements
      const zIndex = await popover.evaluate(el => getComputedStyle(el).zIndex);
      expect(parseInt(zIndex)).toBeGreaterThan(10);
    });

    test('stat cards are clickable filters', async ({ page }) => {
      await page.goto('/admin/schedule');
      const unassignedCard = page.locator('[data-testid="unassigned-card"]');
      await expect(unassignedCard).toBeVisible();
      await unassignedCard.click();
      // Verify filter applied
      await expect(page.locator('[data-testid="filter-active"]')).toContainText('Unassigned');
    });
  });

  test.describe('/admin/analytics', () => {
    test('overview loads with chart', async ({ page }) => {
      await page.goto('/admin/analytics?range=all');
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    });

    test('all-time chart starts from earliest job date', async ({ page }) => {
      await page.goto('/admin/analytics?range=all');
      const chart = page.locator('[data-testid="revenue-chart"]');
      await expect(chart).toBeVisible();
      // Verify x-axis doesn't start with today's date
      const firstLabel = chart.locator('.recharts-xAxis .recharts-cartesian-axis-tick-value').first();
      const text = await firstLabel.textContent();
      expect(text).not.toContain('2026'); // Should start from 2025
    });

    test('range selector matches other pages', async ({ page }) => {
      await page.goto('/admin/analytics');
      const selector = page.locator('[data-testid="range-selector"]');
      await expect(selector).toBeVisible();
      // Should use details/summary pattern
      const details = selector.locator('details');
      await expect(details).toHaveCount(1);
    });

    test('KPI cards are aligned', async ({ page }) => {
      await page.goto('/admin/analytics');
      const cards = page.locator('[data-testid="kpi-card"]');
      await expect(cards).toHaveCount(4);
      // All same height
      const heights = await cards.evaluateAll(els => els.map(el => el.offsetHeight));
      const uniqueHeights = new Set(heights);
      expect(uniqueHeights.size).toBe(1);
    });
  });

  test.describe('/admin/customers', () => {
    test('customer list loads', async ({ page }) => {
      await page.goto('/admin/customers');
      await expect(page.locator('[data-testid="customer-table"]')).toBeVisible();
    });

    test('edit opens as modal', async ({ page }) => {
      await page.goto('/admin/customers');
      await page.click('[data-testid="edit-customer-button"]').first();
      const modal = page.locator('[data-testid="edit-modal"]');
      await expect(modal).toBeVisible();
      // Verify it's a modal, not a page navigation
      await expect(page).toHaveURL(/\/admin\/customers/);
    });
  });

  test.describe('/admin/services', () => {
    test('services list shows all-time label', async ({ page }) => {
      await page.goto('/admin/services');
      await expect(page.locator('text=ALL TIME')).toBeVisible();
    });

    test('service cards show 4 metrics only', async ({ page }) => {
      await page.goto('/admin/services');
      const firstCard = page.locator('[data-testid="service-card"]').first();
      const metrics = firstCard.locator('[data-testid="metric-value"]');
      await expect(metrics).toHaveCount(4);
    });
  });

  test.describe('/admin/technicians', () => {
    test('technicians page loads', async ({ page }) => {
      await page.goto('/admin/technicians');
      await expect(page.locator('[data-testid="technicians-grid"]')).toBeVisible();
    });

    test('top KPI cards are aligned', async ({ page }) => {
      await page.goto('/admin/technicians');
      const cards = page.locator('[data-testid="kpi-strip-card"]');
      await expect(cards).toHaveCount(5);
      const heights = await cards.evaluateAll(els => els.map(el => el.offsetHeight));
      const uniqueHeights = new Set(heights);
      expect(uniqueHeights.size).toBe(1);
    });

    test('assigned + unassigned equals total', async ({ page }) => {
      await page.goto('/admin/technicians');
      const assigned = await page.locator('[data-testid="assigned-count"]').textContent();
      const unassigned = await page.locator('[data-testid="unassigned-count"]').textContent();
      const total = await page.locator('[data-testid="total-jobs-count"]').textContent();
      expect(parseInt(assigned) + parseInt(unassigned)).toBe(parseInt(total));
    });
  });

  test.describe('Global Design System', () => {
    test('focus rings visible on interactive elements', async ({ page }) => {
      await page.goto('/admin/jobs');
      const button = page.locator('button').first();
      await button.focus();
      const outline = await button.evaluate(el => getComputedStyle(el).outline);
      expect(outline).not.toBe('none');
    });

    test('no hydration errors', async ({ page }) => {
      const logs = [];
      page.on('console', msg => {
        if (msg.type() === 'error') logs.push(msg.text());
      });
      await page.goto('/admin/jobs');
      await page.waitForLoadState('networkidle');
      const hydrationErrors = logs.filter(log => 
        log.includes('hydrat') || log.includes('did not match')
      );
      expect(hydrationErrors).toHaveLength(0);
    });
  });
});
