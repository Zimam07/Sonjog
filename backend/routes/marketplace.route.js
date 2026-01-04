import express from 'express';
import {
  createListing,
  getAllListings,
  getMyListings,
  getListing,
  updateListing,
  markAsSold,
  deleteListing,
} from '../controllers/marketplace.controller.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

router.post('/create', isAuthenticated, upload.array('images', 5), createListing);
router.get('/all', isAuthenticated, getAllListings);
router.get('/my-listings', isAuthenticated, getMyListings);
router.get('/:id', isAuthenticated, getListing);
router.put('/:id', isAuthenticated, upload.array('images', 5), updateListing);
router.put('/:id/mark-sold', isAuthenticated, markAsSold);
router.delete('/:id', isAuthenticated, deleteListing);

export default router;
