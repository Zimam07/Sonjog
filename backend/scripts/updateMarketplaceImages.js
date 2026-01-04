import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Marketplace } from '../models/marketplace.model.js';

dotenv.config();

// Sample placeholder images from Unsplash
const placeholderImages = {
  'Books': [
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d',
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f'
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b'
  ],
  'Home & Garden': [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f'
  ]
};

async function updateMarketplaceImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all listings without images
    const listingsWithoutImages = await Marketplace.find({
      $or: [
        { images: { $exists: false } },
        { images: { $size: 0 } }
      ]
    });

    console.log(`Found ${listingsWithoutImages.length} listings without images`);

    for (const listing of listingsWithoutImages) {
      const categoryImages = placeholderImages[listing.category] || placeholderImages['Books'];
      listing.images = [categoryImages[0]]; // Add one placeholder image
      await listing.save();
      console.log(`✓ Updated listing: ${listing.title} (${listing.category})`);
    }

    console.log('\nAll listings updated!');
    console.log('\nCurrent listings:');
    const allListings = await Marketplace.find().select('title images');
    allListings.forEach(l => {
      console.log(`- ${l.title}: ${l.images?.length || 0} images`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateMarketplaceImages();
