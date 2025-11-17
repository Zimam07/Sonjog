/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: 'tests/playwright',
  timeout: 30000,
  use: {
    headless: true,
    baseURL: 'http://localhost:5173',
    actionTimeout: 5000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'Chromium', use: { browserName: 'chromium' } },
  ],
};
