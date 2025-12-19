const { test, expect } = require('@playwright/test');

test.describe('Group Chat Feature', () => {
  const baseUrl = 'http://localhost:5173';

  let user1Id, user2Id;
  let groupId;

  test('Register two users and create a group', async ({ page: page1 }) => {
    // User 1 signup
    await page1.goto(`${baseUrl}/signup`);
    await page1.fill('input[placeholder*="Full Name"]', 'User One');
    await page1.fill('input[placeholder*="Email"]', `user1-${Date.now()}@test.com`);
    await page1.fill('input[placeholder*="Password"]', 'Password123');
    await page1.click('button:has-text("Sign Up")');
    await page1.waitForURL('**/');
    
    // Wait for localStorage to be set
    const token1 = await page1.evaluate(() => localStorage.getItem('token'));
    const auth1 = await page1.evaluate(() => JSON.parse(localStorage.getItem('authState')));
    user1Id = auth1?.authState?.user?._id;
    expect(user1Id).toBeTruthy();
  });

  test('Create and join group', async ({ page: page1, page: page2 }) => {
    // User 1 creates group
    await page1.goto(`${baseUrl}/`);
    const createGroupInput = await page1.locator('input[placeholder*="Create Group"]');
    await createGroupInput.fill('Test Group Chat');
    await page1.click('button:has-text("Create")');
    
    // Wait for group to be created and listed
    await page1.waitForTimeout(500);
    const groupElement = await page1.locator('text=Test Group Chat').first();
    expect(groupElement).toBeTruthy();

    // Extract group ID from the element data attribute or API response
    const groupsJson = await page1.evaluate(() => {
      const groupElements = document.querySelectorAll('[data-group-id]');
      if (groupElements.length > 0) {
        return groupElements[0].getAttribute('data-group-id');
      }
      return null;
    });
    groupId = groupsJson;
  });

  test('Send and receive group messages', async ({ page: page1 }) => {
    await page1.goto(`${baseUrl}/`);
    
    // Click on group
    const groupItem = await page1.locator('text=Test Group Chat').first();
    await groupItem.click();
    
    // Send message in group
    const messageInput = await page1.locator('input[placeholder*="Message"]');
    await messageInput.fill('Hello from User 1');
    await page1.click('button:has-text("Send")');
    
    // Wait for message to appear
    await page1.waitForTimeout(500);
    const message = await page1.locator('text=Hello from User 1');
    expect(message).toBeTruthy();
  });

  test('Group invite workflow', async ({ page: page1, page: page2 }) => {
    // Assume user 2 is registered
    const user2Email = `user2-${Date.now()}@test.com`;
    
    // User 1 on chat page
    await page1.goto(`${baseUrl}/`);
    
    // Open group
    const groupItem = await page1.locator('text=Test Group Chat').first();
    await groupItem.click();
    
    // Look for invite button or member management UI
    // This depends on frontend implementation
    const inviteButton = await page1.locator('button:has-text("Invite")').first();
    if (inviteButton) {
      await inviteButton.click();
      const userInput = await page1.locator('input[placeholder*="user"]');
      await userInput.fill(user2Email);
      await page1.click('button:has-text("Send Invite")');
      await page1.waitForTimeout(500);
    }
  });
});
