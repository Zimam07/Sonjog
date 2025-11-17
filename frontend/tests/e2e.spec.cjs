const axios = require('axios');
const { chromium } = require('playwright');

(async () => {
  try {
    const API = 'http://localhost:8000/api/v1';
    const FRONTEND = 'http://localhost:5173';
    const ts = Date.now();
    const email = `pwtest_${ts}@example.com`;
    const username = `pwtest_${ts}`;
    const password = 'Test@12345';

    console.log('[e2e] Registering test user', email);
    await axios.post(`${API}/user/register`, { username, email, password }, { validateStatus: () => true });

    console.log('[e2e] Logging in...');
    const loginRes = await axios.post(`${API}/user/login`, { email, password }, { withCredentials: true, validateStatus: () => true });

    const setCookie = loginRes.headers && loginRes.headers['set-cookie'];
    if (!setCookie) console.warn('[e2e] No set-cookie received; backend may use other auth method');
    else console.log('[e2e] Received cookie header');

    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const m = cookieStr && cookieStr.match(/^([^=]+)=([^;]+);/);
    const cookieName = m ? m[1] : null;
    const cookieValue = m ? m[2] : null;
    console.log('[e2e] cookieName=', cookieName);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    if (cookieName && cookieValue) {
      await context.addCookies([{ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' }]);
      console.log('[e2e] Cookie set in browser context');
    }

    const page = await context.newPage();
    console.log('[e2e] Opening frontend', FRONTEND);
    await page.goto(FRONTEND, { waitUntil: 'networkidle' });

    // Wait for main layout to render
    await page.waitForSelector('text=Home', { timeout: 5000 }).catch(() => {});

    // Navigate to Explore (robust click with retry)
    console.log('[e2e] Navigating to Explore');
    async function clickWithRetry(selector, attempts = 3, waitMs = 400) {
      for (let i = 0; i < attempts; i++) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.click(selector, { timeout: 2000 });
          return true;
        } catch (err) {
          if (i === attempts - 1) {
            throw err;
          }
          await page.waitForTimeout(waitMs);
        }
      }
      return false;
    }

    try {
      await clickWithRetry('text=Explore', 4, 300).catch((e) => { throw e; });
      await page.waitForTimeout(500);
      console.log('[e2e] URL after Explore:', page.url());
    } catch (e) {
      console.warn('[e2e] Explore click failed (after retries):', e.message);
    }

    // Open notifications (click bell)
    console.log('[e2e] Opening Notifications (best-effort)');
    try {
      // Try multiple bell selectors in order
      const bellSelectors = [
        'button:has(svg[aria-hidden])',
        'button:has(svg)',
        'button:has(svg[data-icon])',
        'text=Notifications',
      ];
      let bellFound = false;
      for (const sel of bellSelectors) {
        try {
          await page.waitForSelector(sel, { timeout: 1200 });
          await page.click(sel).catch(() => {});
          bellFound = true;
          await page.waitForTimeout(400);
          console.log('[e2e] Clicked bell using selector', sel);
          break;
        } catch (err) {
          // try next
        }
      }
      if (!bellFound) console.warn('[e2e] Bell element not found using any selector');
    } catch (e) {
      console.warn('[e2e] Notifications attempt failed', e.message);
    }

    // Navigate to Chat via top send icon
    console.log('[e2e] Navigating to Chat');
    try {
      await page.click('button:has(svg):right-of(text=Sonjog)', { timeout: 3000 }).catch(() => {});
      // fallback: go directly
      await page.goto(`${FRONTEND}/chat`);
      await page.waitForTimeout(400);
      console.log('[e2e] Chat URL:', page.url());
    } catch (e) {
      console.warn('[e2e] Chat navigation failed', e.message);
    }

    // Navigate to profile by using API login response user id if present
    const userId = loginRes.data && loginRes.data.user && loginRes.data.user._id ? loginRes.data.user._id : null;
    if (userId) {
      console.log('[e2e] Navigating to Profile', userId);
      await page.goto(`${FRONTEND}/profile/${userId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      console.log('[e2e] Profile URL:', page.url());
    } else {
      console.warn('[e2e] No userId available from login response');
    }

    await browser.close();
    console.log('[e2e] Finished');
    process.exit(0);
  } catch (err) {
    console.error('[e2e] Error', err && err.stack ? err.stack : err);
    process.exit(2);
  }
})();
