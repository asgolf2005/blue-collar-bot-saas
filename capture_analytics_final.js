const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  await page.fill('input[type="email"]', 'admin@proplumbing.com');
  await page.fill('input[type="password"]', 'admin123');
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  
  await page.goto('http://localhost:3000/admin/analytics?range=all');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'analytics_screenshot.png', fullPage: true });
  console.log('Screenshot saved');
  
  await browser.close();
})();
