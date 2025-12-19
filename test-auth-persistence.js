#!/usr/bin/env node

/**
 * Test script to verify the auth persistence fix
 * 1. Register a user
 * 2. Login to get auth cookie
 * 3. Call /api/v1/user/me to verify auth works
 * 4. Simulate page refresh by calling /me again
 */

const BASE_URL = 'http://localhost:8000/api/v1';

async function test() {
  let cookies = '';
  let registeredEmail = '';
  
  try {
    console.log('1. Registering test user...');
    const testEmail = `test_${Date.now()}@g.bracu.ac.bd`;
    registeredEmail = testEmail;
    
    const registerRes = await fetch(`${BASE_URL}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser_' + Date.now(),
        email: testEmail,
        password: 'pass1234'
      })
    });
    const registerData = await registerRes.json();
    console.log('✓ Register response:', registerData.success ? 'Success' : 'Failed');
    console.log('  Email:', testEmail);

    console.log('\n2. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'pass1234'
      })
    });
    
    // Get cookies from Set-Cookie header
    const setCookie = loginRes.headers.get('set-cookie');
    cookies = setCookie ? setCookie.split(';')[0] : '';
    
    const loginData = await loginRes.json();
    console.log('✓ Login response:', loginData.success ? 'Success' : 'Failed');
    if (!loginData.success) {
      console.log('  Error:', loginData.message);
    }
    console.log('✓ Cookie set:', cookies ? 'Yes' : 'No');

    console.log('\n3. Testing /user/me with auth cookie (first call - fresh)...');
    const meRes1 = await fetch(`${BASE_URL}/user/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    const meData1 = await meRes1.json();
    console.log('✓ /user/me response:', meData1.success ? 'Success' : 'Failed');
    if (meData1.success) {
      console.log('  User:', meData1.user?.username);
    } else {
      console.log('  Error:', meData1.message);
    }

    console.log('\n4. Testing /user/me again (simulating page refresh)...');
    const meRes2 = await fetch(`${BASE_URL}/user/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    const meData2 = await meRes2.json();
    console.log('✓ /user/me response:', meData2.success ? 'Success' : 'Failed');
    if (meData2.success) {
      console.log('  User:', meData2.user?.username);
    } else {
      console.log('  Error:', meData2.message);
    }

    if (meData1.success && meData2.success) {
      console.log('\n✅ Auth persistence test PASSED - User stays logged in on refresh!');
      process.exit(0);
    } else {
      console.log('\n❌ Auth persistence test FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
}

test();
