const { test, expect } = require('@playwright/test');
const axios = require('axios');
const path = require('path');

const API = 'http://localhost:8000/api/v1';

test('Schedule story and publish via API trigger', async ({ page, context }) => {
  const ts = Date.now();
  const email = `sched_${ts}@example.com`;
  const username = `sched_${ts}`;
  const password = 'Test@12345';

  // register and login via API
  await axios.post(`${API}/user/register`, { username, email, password }, { validateStatus: () => true });
  const loginRes = await axios.post(`${API}/user/login`, { email, password }, { withCredentials: true, validateStatus: () => true });

  const setCookie = loginRes.headers && loginRes.headers['set-cookie'];
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const m = cookieStr && cookieStr.match(/^([^=]+)=([^;]+);/);
  const cookieName = m ? m[1] : null;
  const cookieValue = m ? m[2] : null;

  if (cookieName && cookieValue) {
    await context.addCookies([
      { name: cookieName, value: cookieValue, url: 'http://localhost:5173' },
      { name: cookieName, value: cookieValue, url: 'http://localhost:8000' },
    ]);
  }

  // make axios from the test process include the auth cookie for publish trigger
  if (cookieName && cookieValue) {
    axios.defaults.headers.Cookie = `${cookieName}=${cookieValue}`;
  }

  // set persist state
  if (loginRes.data && loginRes.data.user) {
    await context.addInitScript((user) => {
      try {
        const auth = { user, suggestedUsers: [], userProfile: null, posts: [] };
        const root = { auth: JSON.stringify(auth), _persist: JSON.stringify({ version: 1, rehydrated: true }) };
        localStorage.setItem('persist:root', JSON.stringify(root));
      } catch (e) {}
    }, loginRes.data.user);
  }

  await page.goto('/');
  await page.waitForSelector('text=Create Post', { timeout: 5000 });

  // Open Story uploader
  await page.click('text=Upload Story');
  await page.waitForSelector('text=Share Your Story');

  const filePath = path.resolve(__dirname, 'fixtures', 'test-image.png');
  const fileInput = page.locator('input[type=file]').nth(0);
  await fileInput.setInputFiles(filePath);

  // Enable schedule and set a near-future time
  await page.check('input[type=checkbox]');
  const now = new Date(Date.now() + 2000); // 2s in future
  const iso = now.toISOString().slice(0,16);
  await page.fill('input[type=datetime-local]', iso);

  // Click Schedule Story
  await page.click('text=Schedule Story');

  // Trigger publish via API
  await axios.post(`${API}/media/story/publish-now`, {}, { withCredentials: true }).catch(() => {});

  // Wait briefly for UI to update
  await page.waitForTimeout(1000);

  // Refresh home and look for story viewer items
  await page.reload();
  await page.waitForTimeout(1000);

  // open story viewer by checking for story image/video elements
  await page.waitForTimeout(500);
  const hasStory = await page.locator('img[alt="story"], video').first().count();
  expect(hasStory).toBeGreaterThan(0);
});
