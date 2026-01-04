import express from 'express';
import { Marketplace } from '../models/marketplace.model.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';

const router = express.Router();

// Placeholder images for different categories
const placeholderImages = {
  'Books': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800',
  'Sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
  'Home & Garden': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
  'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
  'Clothing': 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800',
  'Vehicles': 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
  'Services': 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800',
  'Other': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'
};

router.get('/add-placeholder-images', isAuthenticated, async (req, res) => {
  try {
    // Find all listings without images
    const listingsWithoutImages = await Marketplace.find({
      $or: [
        { images: { $exists: false } },
        { images: { $size: 0 } },
        { images: null }
      ]
    });

    let updatedCount = 0;
    for (const listing of listingsWithoutImages) {
      const placeholderImage = placeholderImages[listing.category] || placeholderImages['Other'];
      listing.images = [placeholderImage];
      await listing.save();
      updatedCount++;
    }

    return res.json({
      success: true,
      message: `Added placeholder images to ${updatedCount} listings`,
      updatedCount
    });
  } catch (error) {
    console.error('Error adding placeholder images:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
