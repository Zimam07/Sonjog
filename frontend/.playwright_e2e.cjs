const axios = require('axios');
const { chromium } = require('playwright');

(async () => {
  try {
    const ts = Date.now();
    const email = 'pwtest_' + ts + '@example.com';
    const username = 'pwtest_' + ts;
    const password = 'Test@12345';

    console.log('Registering test user', email);
    await axios.post('http://localhost:8000/api/v1/user/register', { username, email, password });

    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:8000/api/v1/user/login', { email, password }, { withCredentials: true, validateStatus: () => true });

    const setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) console.warn('No set-cookie received');
    else console.log('Received cookie header');

    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const m = cookieStr && cookieStr.match(/^([^=]+)=([^;]+);/);
    const cookieName = m ? m[1] : null;
    const cookieValue = m ? m[2] : null;
    console.log('Cookie:', cookieName);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    if (cookieName && cookieValue) {
      await context.addCookies([{ name: cookieName, value: cookieValue, domain: 'localhost', path: '/' }]);
      console.log('Cookie set in browser context');
    }

    const page = await context.newPage();
    console.log('Opening frontend');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(500);

    console.log('Clicking Explore');
    try { await page.click('text=Explore', { timeout: 2000 }); } catch (e) { console.warn('Explore click failed', e.message); }
    await page.waitForTimeout(300);
    console.log('URL after Explore:', page.url());

    console.log('Opening Notifications (top bell)');
    try { await page.click('button:has(svg[aria-hidden="true"]) >> nth=0', { timeout: 2000 }); } catch (e) { console.warn('Notifications click attempt failed', e.message); }
    await page.waitForTimeout(300);

    console.log('Clicking Messages (chat) via top send icon');
    try { await page.click('button:has(svg[role="img"])', { timeout: 2000 }); } catch (e) { console.warn('Send icon click failed', e.message); }
    await page.waitForTimeout(300);

    const userId = loginRes.data && loginRes.data.user && loginRes.data.user._id ? loginRes.data.user._id : null;
    if (userId) {
      console.log('Navigating to Profile');
      await page.goto('http://localhost:5173/profile/' + userId);
      await page.waitForTimeout(500);
      console.log('Profile URL:', page.url());
    } else {
      console.warn('No userId available from login response');
    }

    await browser.close();
    console.log('Playwright script finished successfully');
    process.exit(0);
  } catch (e) {
    console.error('Error in script', e && e.message ? e.message : e);
    process.exit(2);
  }
})();
