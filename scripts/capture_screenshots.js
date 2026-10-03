import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');

async function capture() {
  console.log('Launching browser for comprehensive screenshots...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 1. Desktop Light Login
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotsDir, 'desktop-login-light.png') });
  console.log('✓ Captured desktop-login-light.png');

  // 2. Desktop Dark Login
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotsDir, 'desktop-login-dark.png') });
  console.log('✓ Captured desktop-login-dark.png');

  // 3. Mobile Light Login
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotsDir, 'mobile-login-light.png') });
  console.log('✓ Captured mobile-login-light.png');

  // 4. Mobile Dark Login
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotsDir, 'mobile-login-dark.png') });
  console.log('✓ Captured mobile-login-dark.png');

  // 5. Sign in as Instructor and view Control Room
  await page.setViewport({ width: 1280, height: 800 });
  // Click Instructor demo preset button
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await (await b.getProperty('innerText')).jsonValue();
    if (text.includes('Instructor')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 300));
  // Click submit sign in
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));

  // Instructor Dashboard screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'desktop-instructor-dashboard.png') });
  console.log('✓ Captured desktop-instructor-dashboard.png');

  // If there's an exercise or create one
  await page.goto('http://localhost:5173/instructor/scenarios', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, 'desktop-scenario-editor.png') });
  console.log('✓ Captured desktop-scenario-editor.png');

  // Admin Portal overview
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, 'desktop-admin-overview.png') });
  console.log('✓ Captured desktop-admin-overview.png');

  await browser.close();
  console.log('All comprehensive screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
