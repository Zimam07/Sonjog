import mongoose from 'mongoose';

const marketplaceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Vehicles', 'Services', 'Other'],
  },
  price: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  images: [{
    type: String,
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isSold: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export const Marketplace = mongoose.model('Marketplace', marketplaceSchema);
