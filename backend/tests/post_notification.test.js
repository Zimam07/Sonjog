import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import connectDB from '../db.js';
import app from '../index.js';
import assert from 'assert';
import { Post } from '../models/post.model.js';

let mongod;

describe('Posts and notifications', function() {
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

  it('should create a post, comment by another user, and notify post owner', async () => {
    // register user A (post owner)
    await request(app)
      .post('/api/v1/user/register')
      .send({ username: 'owner', email: 'owner@g.bracu.ac.bd', password: 'ownerpass' })
      .set('Accept', 'application/json');

    // register user B (commenter)
    await request(app)
      .post('/api/v1/user/register')
      .send({ username: 'commenter', email: 'commenter@g.bracu.ac.bd', password: 'commentpass' })
      .set('Accept', 'application/json');

    // find users to get ids
    const ownerLogin = await request(app)
      .post('/api/v1/user/login')
      .send({ email: 'owner@g.bracu.ac.bd', password: 'ownerpass' })
      .set('Accept', 'application/json');
    assert.strictEqual(ownerLogin.status, 200);
    const ownerId = ownerLogin.body.user._id;

    const commenterLogin = await request(app)
      .post('/api/v1/user/login')
      .send({ email: 'commenter@g.bracu.ac.bd', password: 'commentpass' })
      .set('Accept', 'application/json');
    assert.strictEqual(commenterLogin.status, 200);
    const commenterCookie = commenterLogin.headers['set-cookie'];

    // create a post directly in DB for owner
    const newPost = await Post.create({ caption: 'Hello world #test', image: 'http://example.com/img.jpg', author: ownerId });

    // commenter posts a comment on the post
    const commentRes = await request(app)
      .post(`/api/v1/post/${newPost._id}/comment`)
      .set('Cookie', commenterCookie)
      .send({ text: 'Nice post!' })
      .set('Accept', 'application/json');

    assert.strictEqual(commentRes.status, 201);

    // owner logs in and fetches notifications
    const ownerLogin2 = await request(app)
      .post('/api/v1/user/login')
      .send({ email: 'owner@g.bracu.ac.bd', password: 'ownerpass' })
      .set('Accept', 'application/json');
    const ownerCookie = ownerLogin2.headers['set-cookie'];

    const notifRes = await request(app)
      .get('/api/v1/notification')
      .set('Cookie', ownerCookie)
      .set('Accept', 'application/json');

    assert.strictEqual(notifRes.status, 200);
    assert.strictEqual(Array.isArray(notifRes.body.notifications), true);
    assert.ok(notifRes.body.notifications.length >= 1, 'should have at least one notification');

  });
});
