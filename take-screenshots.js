const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\gpt30\\Downloads\\TalkTrack_Screenshots';
const BASE_URL = 'https://talktrack-three.vercel.app';

// Pixel 5 dimensions: 1080 x 1920 (9:16 ratio) - perfect for Play Store
const VIEWPORT = {
  width: 360,
  height: 640,
  deviceScaleFactor: 3, // 360*3 = 1080, 640*3 = 1920
  isMobile: true,
  hasTouch: true,
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

async function takeScreenshots() {
  // Clear old screenshots
  if (fs.existsSync(SCREENSHOT_DIR)) {
    const oldFiles = fs.readdirSync(SCREENSHOT_DIR);
    oldFiles.forEach(f => fs.unlinkSync(path.join(SCREENSHOT_DIR, f)));
  } else {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: VIEWPORT,
    args: ['--window-size=400,700'],
  });

  const page = await browser.newPage();

  await page.setCookie({
    name: 'talktrack-beta-auth',
    value: 'authenticated',
    domain: 'talktrack-three.vercel.app',
  });

  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);

  let screenshotCount = 0;
  async function screenshot(name, description) {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}_${name}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, type: 'png' });
    console.log(`  ✓ ${description}`);
    return filename;
  }

  try {
    // 1. Import screen
    console.log('\n1. Import screen...');
    await page.goto(`${BASE_URL}/import`, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    await screenshot('import', 'Import screen');

    // 2. Type demo talk
    console.log('\n2. Creating demo talk...');
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.click();
      await textarea.type(DEMO_TALK, { delay: 1 });
      await delay(500);

      // Click Preview Slides
      await clickByText(page, 'Preview');
      await delay(1500);
      await screenshot('preview', 'Preview slides');

      // Click Save Talk
      await clickByText(page, 'Save');
      await delay(2000);
    }

    // 3. Home with talk
    console.log('\n3. Home screen...');
    await screenshot('home', 'Home with talk');

    // 4. Click on the talk to go to detail
    console.log('\n4. Talk detail (mode selection)...');
    const talkLink = await page.$('a[href*="/talk/"]');
    if (talkLink) {
      // Get the talk ID from the link
      const href = await page.evaluate(el => el.getAttribute('href'), talkLink);
      const talkId = href.match(/\/talk\/([^/]+)/)?.[1];
      console.log(`   Talk ID: ${talkId}`);

      await talkLink.click();
      await delay(2000);
      await screenshot('talk_detail', 'Talk detail - choose mode');

      // 5. Click Listen mode (first mode card)
      console.log('\n5. Listen mode rehearsal...');
      if (talkId) {
        // Navigate directly to rehearsal
        await page.goto(`${BASE_URL}/talk/${talkId}/rehearse?mode=listen`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        await delay(3000);
        await screenshot('rehearsal_listen', 'Listen mode - StateOrb');
      }

      // 6. Go back and try Prompt mode
      console.log('\n6. Prompt mode...');
      if (talkId) {
        await page.goto(`${BASE_URL}/talk/${talkId}/rehearse?mode=prompt`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        await delay(3000);
        await screenshot('rehearsal_prompt', 'Prompt mode');
      }

      // 7. Stats page
      console.log('\n7. Stats...');
      if (talkId) {
        await page.goto(`${BASE_URL}/talk/${talkId}/stats`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        await delay(2000);
        await screenshot('stats', 'Statistics');
      }
    }

    // 8. Settings
    console.log('\n8. Settings...');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    await screenshot('settings', 'Settings');

    console.log('\n✅ All screenshots complete!\n');

  } catch (error) {
    console.error('\nError:', error.message);
  }

  // List all screenshots
  const files = fs.readdirSync(SCREENSHOT_DIR).sort();
  console.log(`Saved ${files.length} screenshots to:\n${SCREENSHOT_DIR}\n`);
  files.forEach(f => {
    const stats = fs.statSync(path.join(SCREENSHOT_DIR, f));
    console.log(`  ${f} (${Math.round(stats.size / 1024)} KB)`);
  });

  console.log('\nBrowser open for manual screenshots. Ctrl+C to close.\n');
  await new Promise(() => {});
}

takeScreenshots().catch(console.error);
