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

export const deleteReel = async (req, res) => {
  try {
    const reelId = req.params.id;
    const authorId = req.id;

    console.log('Delete reel request:', { reelId, authorId });

    const reel = await Reel.findById(reelId);
    if (!reel) {
      console.log('Reel not found:', reelId);
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    console.log('Reel found:', { reelAuthor: reel.author.toString(), requestAuthor: authorId });

    // Check if the user is the author of the reel
    if (reel.author.toString() !== authorId) {
      console.log('Unauthorized delete attempt');
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this reel' });
    }

    await Reel.findByIdAndDelete(reelId);
    console.log('Reel deleted successfully:', reelId);
    return res.status(200).json({ success: true, message: 'Reel deleted successfully' });
  } catch (error) {
    console.log('Delete reel error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
