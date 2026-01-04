import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Marketplace } from '../models/marketplace.model.js';

dotenv.config();

async function deleteAllMarketplaceListings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const count = await Marketplace.countDocuments();
    console.log(`Found ${count} marketplace listings`);

    if (count > 0) {
      await Marketplace.deleteMany({});
      console.log('✓ All marketplace listings deleted');
      console.log('\nYou can now create fresh listings with images!');
    } else {
      console.log('No listings to delete');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAllMarketplaceListings();
