// Ensure test env is set before importing app so index.js does not auto-start the server
process.env.NODE_ENV = 'test';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import connectDB from '../db.js';
import app from '../index.js';
import assert from 'assert';

let mongod;

describe('Auth integration tests', function() {
  this.timeout(20000);

  before(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    await connectDB();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('should register a new BRACU user and return verifyUrl', async () => {
    const res = await request(app)
      .post('/api/v1/user/register')
      .send({ username: 'testuser', email: 'test@g.bracu.ac.bd', password: 'pass1234' })
      .set('Accept', 'application/json');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.verifyUrl, 'verifyUrl should be returned in response');
  });

  it('should login the user after registration', async () => {
    // first register
    await request(app)
      .post('/api/v1/user/register')
      .send({ username: 'loginuser', email: 'login@g.bracu.ac.bd', password: 'pass5678' })
      .set('Accept', 'application/json');

    const res = await request(app)
      .post('/api/v1/user/login')
      .send({ email: 'login@g.bracu.ac.bd', password: 'pass5678' })
      .set('Accept', 'application/json');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.headers['set-cookie'], 'cookie should be set on login');
  });
});
