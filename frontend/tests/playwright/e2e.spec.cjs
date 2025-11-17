const { test, expect } = require('@playwright/test');
const axios = require('axios');

const API = 'http://localhost:8000/api/v1';

test('basic navigation and notifications smoke', async ({ page, context }) => {
  const ts = Date.now();
  const email = `pwtest_${ts}@example.com`;
  const username = `pwtest_${ts}`;
  const password = 'Test@12345';

  await axios.post(`${API}/user/register`, { username, email, password }, { validateStatus: () => true });
  const loginRes = await axios.post(`${API}/user/login`, { email, password }, { withCredentials: true, validateStatus: () => true });

  const setCookie = loginRes.headers && loginRes.headers['set-cookie'];
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const m = cookieStr && cookieStr.match(/^([^=]+)=([^;]+);/);
  const cookieName = m ? m[1] : null;
  const cookieValue = m ? m[2] : null;

  if (cookieName && cookieValue) {
    const cookieObj = {
      name: cookieName,
      value: cookieValue,
      url: 'http://localhost:5173',
    };
    await context.addCookies([cookieObj]);
  }

  // Persist auth into localStorage so the app rehydrates as authenticated
  if (loginRes.data && loginRes.data.user) {
    await context.addInitScript((user) => {
      try {
        const auth = { user, suggestedUsers: [], userProfile: null, posts: [] };
        const root = {
          auth: JSON.stringify(auth),
          _persist: JSON.stringify({ version: 1, rehydrated: true }),
        };
        localStorage.setItem('persist:root', JSON.stringify(root));
      } catch (e) { }
    }, loginRes.data.user);
  }

  // debug listeners
  page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));
  page.on('requestfailed', req => console.log('[REQ FAILED]', req.url(), req.failure() && req.failure().errorText));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  try {
    await page.screenshot({ path: 'test-results/playwright-home-cjs.png', fullPage: true });
  } catch (e) {}

  await expect(page.getByText('Home')).toBeVisible({ timeout: 10000 });

  await page.click('text=Explore');
  await expect(page).toHaveURL(/\/explore/);

  const bell = page.locator('button:has(svg)').first();
  if (await bell.count() > 0) {
    await bell.click().catch(() => {});
  }

  await page.goto('/chat');
  await expect(page).toHaveURL(/\/chat/);

  const userId = loginRes.data && loginRes.data.user && loginRes.data.user._id ? loginRes.data.user._id : null;
  if (userId) {
    await page.goto(`/profile/${userId}`);
    await expect(page).toHaveURL(new RegExp(`/profile/${userId}`));
  }
});
