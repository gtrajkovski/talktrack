const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://talktrack-three.vercel.app';
const BASE_DIR = 'C:\\Users\\gpt30\\Downloads\\TalkTrack_Screenshots';

// Device configurations
const DEVICES = {
  'tablet_7inch': {
    dir: 'Tablet_7inch',
    viewport: {
      width: 600,
      height: 1024,
      deviceScaleFactor: 2, // 1200 x 2048 actual
      isMobile: true,
      hasTouch: true,
    }
  },
  'tablet_10inch': {
    dir: 'Tablet_10inch',
    viewport: {
      width: 800,
      height: 1280,
      deviceScaleFactor: 2, // 1600 x 2560 actual
      isMobile: true,
      hasTouch: true,
    }
  },
  'chromebook': {
    dir: 'Chromebook',
    viewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1, // 1920 x 1080 actual (landscape)
      isMobile: false,
      hasTouch: false,
    }
  }
};

const DEMO_TALK = `Introduction
Welcome everyone to today's presentation on product strategy and market opportunity.

Market Opportunity
The market is growing at 25% annually. Our target segment represents $2 billion in potential revenue. Key trends favor our approach.

Our Solution
We offer a unique voice-first approach that saves users 2 hours per week. No screen required - practice anywhere.

Competitive Advantage
Unlike competitors, our solution works completely hands-free while commuting, jogging, or doing chores.

Call to Action
Download the app today and start rehearsing your next presentation. Your audience will thank you.`;

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickByText(page, text) {
  return await page.evaluate((searchText) => {
    const elements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const el = elements.find(e =>
      e.textContent && e.textContent.toLowerCase().includes(searchText.toLowerCase())
    );
    if (el) {
      el.click();
      return true;
    }
    return false;
  }, text);
}

async function captureForDevice(browser, deviceName, config) {
  const dir = path.join(BASE_DIR, config.dir);

  // Clear and create directory
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📱 ${deviceName.toUpperCase()}`);
  console.log(`   Viewport: ${config.viewport.width}x${config.viewport.height} @ ${config.viewport.deviceScaleFactor}x`);
  console.log(`   Output: ${config.viewport.width * config.viewport.deviceScaleFactor}x${config.viewport.height * config.viewport.deviceScaleFactor}`);
  console.log(`${'='.repeat(50)}`);

  const page = await browser.newPage();
  await page.setViewport(config.viewport);

  await page.setCookie({
    name: 'talktrack-beta-auth',
    value: 'authenticated',
    domain: 'talktrack-three.vercel.app',
  });

  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);

  let count = 0;
  async function screenshot(name, description) {
    count++;
    const filename = `${String(count).padStart(2, '0')}_${name}.png`;
    const filepath = path.join(dir, filename);
    await page.screenshot({ path: filepath, type: 'png' });
    console.log(`  ✓ ${description}`);
  }

  try {
    // 1. Import screen
    await page.goto(`${BASE_URL}/import`, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    await screenshot('import', 'Import screen');

    // 2. Create demo talk
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.click();
      await textarea.type(DEMO_TALK, { delay: 1 });
      await delay(500);
      await clickByText(page, 'Preview');
      await delay(1500);
      await screenshot('preview', 'Preview slides');
      await clickByText(page, 'Save');
      await delay(2000);
    }

    // 3. Home with talk
    await screenshot('home', 'Home with talk');

    // 4. Talk detail
    const talkLink = await page.$('a[href*="/talk/"]');
    if (talkLink) {
      const href = await page.evaluate(el => el.getAttribute('href'), talkLink);
      const talkId = href.match(/\/talk\/([^/]+)/)?.[1];

      await talkLink.click();
      await delay(2000);
      await screenshot('talk_detail', 'Talk detail');

      // 5. Rehearsal modes
      if (talkId) {
        await page.goto(`${BASE_URL}/talk/${talkId}/rehearse?mode=listen`, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(3000);
        await screenshot('rehearsal', 'Rehearsal mode');

        // 6. Stats
        await page.goto(`${BASE_URL}/talk/${talkId}/stats`, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(2000);
        await screenshot('stats', 'Statistics');
      }
    }

    // 7. Settings
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    await screenshot('settings', 'Settings');

  } catch (error) {
    console.error(`  Error: ${error.message}`);
  }

  await page.close();

  // List files
  const files = fs.readdirSync(dir).sort();
  console.log(`\n  Captured ${files.length} screenshots`);
  return files.length;
}

async function main() {
  console.log('Launching browser...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1950,1150'],
  });

  let totalScreenshots = 0;

  for (const [deviceName, config] of Object.entries(DEVICES)) {
    totalScreenshots += await captureForDevice(browser, deviceName, config);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ COMPLETE: ${totalScreenshots} total screenshots`);
  console.log(`${'='.repeat(50)}`);
  console.log(`\nSaved to: ${BASE_DIR}`);
  console.log('  - Tablet_7inch/');
  console.log('  - Tablet_10inch/');
  console.log('  - Chromebook/');

  // Verify dimensions
  console.log('\nVerifying dimensions...');
  for (const config of Object.values(DEVICES)) {
    const dir = path.join(BASE_DIR, config.dir);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    if (files.length > 0) {
      const buffer = fs.readFileSync(path.join(dir, files[0]));
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      console.log(`  ${config.dir}: ${width} x ${height}`);
    }
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(console.error);
