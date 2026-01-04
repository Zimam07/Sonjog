import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { upload } from '../middlewares/multer.js';
import { addStory, getStories, getScheduledStories, cancelScheduledStory, updateScheduledStory, deleteStory } from '../controllers/story.controller.js';
import { addReel, getAllReels, deleteReel } from '../controllers/reel.controller.js';

const router = express.Router();

// Story endpoints
router.route('/story').post(isAuthenticated, upload.single('media'), addStory);
router.route('/story/all').get(isAuthenticated, getStories);
router.route('/story/:id').delete(isAuthenticated, deleteStory);
// Scheduled story management
router.route('/story/scheduled').get(isAuthenticated, getScheduledStories);
router.route('/story/scheduled/:id').delete(isAuthenticated, cancelScheduledStory).put(isAuthenticated, upload.single('media'), updateScheduledStory);
// Trigger publish now (dev/test only) — promotes scheduled stories immediately
router.route('/story/publish-now').post(isAuthenticated, async (req, res) => {
	if (process.env.NODE_ENV === 'production') return res.status(403).json({ success: false, message: 'Not allowed in production' });
	try {
		const { publishScheduledStories } = await import('../controllers/story.controller.js');
		const r = await publishScheduledStories();
		return res.json({ success: true, result: r });
	} catch (e) {
		return res.status(500).json({ success: false, message: e.message });
	}
});

// Reels endpoints
router.route('/reel').post(isAuthenticated, upload.single('media'), addReel);
router.route('/reel/all').get(isAuthenticated, getAllReels);
router.route('/reel/:id').delete(isAuthenticated, deleteReel);

export default router;
