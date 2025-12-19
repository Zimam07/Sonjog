import { Story } from '../models/story.model.js';
import getDataUri from '../utils/datauri.js';
import cloudinary from '../utils/cloudinary.js';
import storage from '../utils/storage.js';
import path from 'path';

export const addStory = async (req, res) => {
  try {
    const authorId = req.id;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'Media required' });

    const now = new Date();

    // If client requested scheduling (future time), we defer uploading to Cloudinary
    const { scheduledAt } = req.body || {};
    let storyPayload = {
      author: authorId,
      mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
    };

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid scheduledAt' });
      }
      if (scheduledDate > now) {
        // Save file buffer to temporary folder for later upload
        const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video/') ? '.mp4' : '.png');
        const tmp = await storage.saveTemp(file.buffer, `${Date.now()}${ext}`);
        storyPayload.scheduledAt = scheduledDate;
        storyPayload.status = 'scheduled';
        storyPayload.tempPath = tmp;
        // Do not set expiresAt/publishedAt or mediaUrl yet
      } else {
        // scheduled time in the past — treat as immediate publish
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream((err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
          stream.end(file.buffer);
        });
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        storyPayload.mediaUrl = uploadResult.secure_url;
        storyPayload.expiresAt = expiresAt;
        storyPayload.status = 'active';
        storyPayload.publishedAt = now;
      }
    } else {
      // immediate publish
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream((err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        stream.end(file.buffer);
      });
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      storyPayload.mediaUrl = uploadResult.secure_url;
      storyPayload.expiresAt = expiresAt;
      storyPayload.status = 'active';
      storyPayload.publishedAt = now;
    }

    storyPayload.author = authorId;
    const story = await Story.create(storyPayload);
    return res.status(201).json({ success: true, story, message: storyPayload.status === 'scheduled' ? 'Story scheduled' : 'Story uploaded' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStories = async (req, res) => {
  try {
    // fetch recent stories (active ones not yet expired)
    const stories = await Story.find({ status: 'active', expiresAt: { $gt: new Date() }, mediaUrl: { $exists: true, $ne: '' } })
      .sort({ createdAt: -1 })
      .populate('author', 'username profilePicture');
    return res.status(200).json({ success: true, stories });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Publish scheduled stories whose scheduledAt <= now. This function is safe to call periodically.
export const publishScheduledStories = async () => {
  try {
    const now = new Date();
    const scheduled = await Story.find({ status: 'scheduled', scheduledAt: { $lte: now } });
    if (!scheduled || scheduled.length === 0) return { published: 0 };

    let publishedCount = 0;
    for (const s of scheduled) {
      try {
        // If there is a tempPath, upload the file now
        if (s.tempPath) {
          // upload buffer returned from storage layer to cloudinary using upload_stream
          const buf = await storage.uploadTempToCloud(s.tempPath);
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream((err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
            stream.end(buf);
          });
          s.mediaUrl = uploadResult.secure_url;
          // delete stored temp
          try { await storage.deleteTemp(s.tempPath); } catch (e) {}
          s.tempPath = undefined;
        }
        s.status = 'active';
        s.publishedAt = now;
        s.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        await s.save();
        publishedCount++;
      } catch (inner) {
        console.log('Error publishing scheduled story', s._id, inner);
      }
    }
    return { published: publishedCount };
  } catch (error) {
    console.log('publishScheduledStories error', error);
    return { published: 0, error };
  }
};

export const getScheduledStories = async (req, res) => {
  try {
    const authorId = req.id;
    const stories = await Story.find({ author: authorId, status: 'scheduled' }).sort({ scheduledAt: 1 });
    return res.status(200).json({ success: true, stories });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelScheduledStory = async (req, res) => {
  try {
    const authorId = req.id;
    const id = req.params.id;
    const story = await Story.findOneAndDelete({ _id: id, author: authorId, status: 'scheduled' });
    if (!story) return res.status(404).json({ success: false, message: 'Scheduled story not found' });
    if (story.tempPath) {
      try { await storage.deleteTemp(story.tempPath); } catch (e) { /* ignore */ }
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStory = async (req, res) => {
  try {
    const authorId = req.id;
    const storyId = req.params.id;
    
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });
    
    // Only the author can delete their story
    if (String(story.author) !== String(authorId)) {
      return res.status(403).json({ success: false, message: 'Only the story author can delete' });
    }
    
    // Delete from Cloudinary if mediaUrl exists
    if (story.mediaUrl) {
      try {
        const publicId = story.mediaUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.log('Error deleting from Cloudinary:', e);
      }
    }
    
    // Delete temp file if exists
    if (story.tempPath) {
      try { await storage.deleteTemp(story.tempPath); } catch (e) {}
    }
    
    await Story.findByIdAndDelete(storyId);
    return res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateScheduledStory = async (req, res) => {
  try {
    const authorId = req.id;
    const id = req.params.id;
    const story = await Story.findOne({ _id: id, author: authorId, status: 'scheduled' });
    if (!story) return res.status(404).json({ success: false, message: 'Scheduled story not found' });

    // allow updating scheduledAt
    const { scheduledAt } = req.body || {};
    if (scheduledAt) {
      const sd = new Date(scheduledAt);
      if (isNaN(sd.getTime())) return res.status(400).json({ success: false, message: 'Invalid scheduledAt' });
      story.scheduledAt = sd;
    }

    // allow replacing media file (will save via storage.saveTemp)
    if (req.file) {
      // remove previous temp if exists
      if (story.tempPath) {
        try { await storage.deleteTemp(story.tempPath); } catch (e) {}
      }
      const ext = path.extname(req.file.originalname) || (req.file.mimetype.startsWith('video/') ? '.mp4' : '.png');
      const tmp = await storage.saveTemp(req.file.buffer, `${Date.now()}${ext}`);
      story.tempPath = tmp;
      // ensure mediaUrl cleared until publish
      story.mediaUrl = undefined;
    }

    await story.save();
    return res.json({ success: true, story });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
