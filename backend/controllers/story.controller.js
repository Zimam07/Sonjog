import { Story } from '../models/story.model.js';
import getDataUri from '../utils/datauri.js';
import cloudinary from '../utils/cloudinary.js';

export const addStory = async (req, res) => {
  try {
    const authorId = req.id;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'Media required' });

    const fileUri = getDataUri(file);
    const cloudResponse = await cloudinary.uploader.upload(fileUri);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const story = await Story.create({
      author: authorId,
      mediaUrl: cloudResponse.secure_url,
      mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
      expiresAt,
    });

    return res.status(201).json({ success: true, story, message: 'Story uploaded' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStories = async (req, res) => {
  try {
    // fetch recent stories (not yet expired)
    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .populate('author', 'username profilePicture');
    return res.status(200).json({ success: true, stories });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
