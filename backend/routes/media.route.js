import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { upload } from '../middlewares/multer.js';
import { addStory, getStories } from '../controllers/story.controller.js';
import { addReel, getAllReels } from '../controllers/reel.controller.js';

const router = express.Router();

// Story endpoints
router.route('/story').post(isAuthenticated, upload.single('media'), addStory);
router.route('/story/all').get(isAuthenticated, getStories);

// Reels endpoints
router.route('/reel').post(isAuthenticated, upload.single('media'), addReel);
router.route('/reel/all').get(isAuthenticated, getAllReels);

export default router;
