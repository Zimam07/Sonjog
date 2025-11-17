import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import connectDB from '../db.js';
import app from '../index.js';
import assert from 'assert';

let mongod;

describe('Verify/resend tests', function() {
  this.timeout(20000);

  before(async () => {
    process.env.NODE_ENV = 'test';
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    await connectDB();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('should register and resend verification', async () => {
    const reg = await request(app)
      .post('/api/v1/user/register')
      .send({ username: 'rvuser', email: 'rv@g.bracu.ac.bd', password: 'abc12345' })
      .set('Accept', 'application/json');

    assert.strictEqual(reg.status, 201);
    const resend = await request(app)
      .post('/api/v1/user/resend')
      .send({ email: 'rv@g.bracu.ac.bd' })
      .set('Accept', 'application/json');

    assert.strictEqual(resend.status, 200);
    assert.strictEqual(resend.body.success, true);
    assert.ok(resend.body.verifyUrl);
  });
});
