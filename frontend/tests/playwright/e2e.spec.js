import { test, expect } from '@playwright/test';
import axios from 'axios';

const API = 'http://localhost:8000/api/v1';

test('basic navigation and notifications smoke (ESM)', async ({ page, context }) => {
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
    // parse attributes from set-cookie string to better match server cookie properties
    const attrs = (cookieStr || '').split(';').slice(1).map(s => s.trim());
    const httpOnly = attrs.some(a => /^httponly$/i.test(a));
    const secure = attrs.some(a => /^secure$/i.test(a));
    const sameSiteAttr = attrs.find(a => /^samesite=/i.test(a));
    const sameSite = sameSiteAttr ? sameSiteAttr.split('=')[1] : undefined;
    const expiresAttr = attrs.find(a => /^expires=/i.test(a));
    let expires = undefined;
    if (expiresAttr) {
      const dateStr = expiresAttr.split('=')[1];
      const d = new Date(dateStr);
      if (!isNaN(d)) expires = Math.floor(d.getTime() / 1000);
    }

    // keep cookie simple and set by url so Playwright accepts it
    const cookieObj = {
      name: cookieName,
      value: cookieValue,
      url: 'http://localhost:5173',
    };

    await context.addCookies([cookieObj]);
  }

    // Persist auth into localStorage (redux-persist format) so the app rehydrates as authenticated
    if (loginRes.data && loginRes.data.user) {
      await context.addInitScript((user) => {
        try {
          const auth = { user, suggestedUsers: [], userProfile: null, posts: [] };
          const root = {
            auth: JSON.stringify(auth),
            _persist: JSON.stringify({ version: 1, rehydrated: true }),
          };
          localStorage.setItem('persist:root', JSON.stringify(root));
        } catch (e) { /* ignore */ }
      }, loginRes.data.user);
    }
    // now load the app which will rehydrate from localStorage set by init script
    await page.goto('/');
    // dump persisted state for debugging
    const persisted = await page.evaluate(() => localStorage.getItem('persist:root'));
    console.log('[PERSISTED]', persisted && persisted.substring ? persisted.substring(0, 1000) : persisted);
    // if available, dump the app store state (dev-only) to confirm auth is present
    try {
      const storeState = await page.evaluate(() => {
        try {
          return window.__APP_STORE__ ? window.__APP_STORE__.getState() : null;
        } catch (e) { return { error: String(e) }; }
      });
      console.log('[STORE STATE]', JSON.stringify(storeState && storeState.auth ? storeState.auth.user : storeState));
    } catch (e) {
      console.log('[STORE STATE] evaluate failed', String(e));
    }
    // log page console and network responses for debugging signup/login
    page.on('console', msg => {
      console.log('[PAGE]', msg.type(), msg.text());
    });
    page.on('requestfailed', req => {
      console.log('[REQ FAILED]', req.url(), req.failure() && req.failure().errorText);
    });
    page.on('response', async (resp) => {
      try {
        if (resp.url().includes('/api/v1/user/login') || resp.url().includes('/api/v1/user/register')) {
          const txt = await resp.text();
          console.log('[RESP]', resp.url(), resp.status(), txt && txt.substring ? txt.substring(0, 300) : txt);
        }
      } catch (e) {}
    });
    // If the login form is present, perform UI login; otherwise assume we're already authenticated
    try {
      await page.waitForSelector('input[name="email"]', { timeout: 2000 });
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
    } catch (e) {
      console.log('[TEST] Login form not present; skipping UI login (already authenticated)');
    }

  // save a screenshot for debugging what the page shows in CI/headless
  try {
    await page.screenshot({ path: 'test-results/playwright-home.png', fullPage: true });
  } catch (e) {
    // ignore screenshot failures
  }

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
