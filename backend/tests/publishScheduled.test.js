// Ensure test env is set before importing app
process.env.NODE_ENV = 'test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import connectDB from '../db.js';
import { Story } from '../models/story.model.js';
import { User } from '../models/user.model.js';
import { publishScheduledStories } from '../controllers/story.controller.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import cloudinary from '../utils/cloudinary.js';

// Ensure cloudinary uploader is a no-op in tests to avoid network calls
if (cloudinary && cloudinary.uploader) {
  cloudinary.uploader.upload = async () => ({ secure_url: 'http://example.com/test-image.png' });
}

let mongod;

describe('publishScheduledStories', function() {
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

  it('uploads temp file and publishes scheduled story', async () => {
    // create a user
    const user = await User.create({ username: 'scheduser', email: 'sched@example.com', password: 'pass1234' });

    // create tmp dir and file
    const tmpDir = path.resolve('./tmp_test_scheduled');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, 'test.png');
    // write a tiny 1x1 png
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGBgAAAABAABJzQnCgAAAABJRU5ErkJggg==';
    fs.writeFileSync(tmpFile, Buffer.from(pngBase64, 'base64'));

    // create scheduled story document pointing to tmpFile
    const scheduledAt = new Date(Date.now() - 1000); // in the past so it should be published
    const story = await Story.create({ author: user._id, status: 'scheduled', scheduledAt, tempPath: tmpFile, mediaType: 'image' });

    const res = await publishScheduledStories();
    // publishedCount should be >=1
    assert.ok(res.published >= 1, 'At least one story should be published');

    const updated = await Story.findById(story._id);
    assert.strictEqual(updated.status, 'active');
    assert.ok(updated.expiresAt, 'expiresAt should be set');
    assert.ok(updated.publishedAt, 'publishedAt should be set');

    // temp file should be removed
    const exists = fs.existsSync(tmpFile);
    assert.strictEqual(exists, false, 'temp file should be removed after publish');

    // cleanup
    try { if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e){}
  });
});
