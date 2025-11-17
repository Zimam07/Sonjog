import { Reel } from '../models/reel.model.js';
import getDataUri from '../utils/datauri.js';
import cloudinary from '../utils/cloudinary.js';

export const addReel = async (req, res) => {
  try {
    const authorId = req.id;
    const file = req.file;
    const { caption } = req.body;
    if (!file) return res.status(400).json({ success: false, message: 'Video required' });

    const fileUri = getDataUri(file);
    const cloudResponse = await cloudinary.uploader.upload(fileUri, { resource_type: 'video' });

    const reel = await Reel.create({
      author: authorId,
      videoUrl: cloudResponse.secure_url,
      caption: caption || '',
    });

    return res.status(201).json({ success: true, reel, message: 'Reel uploaded' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const skip = (page - 1) * limit;

    const reels = await Reel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'username profilePicture');
    const total = await Reel.countDocuments();
    return res.status(200).json({ success: true, reels, pagination: { page, limit, total } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
