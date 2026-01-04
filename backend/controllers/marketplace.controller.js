import { Marketplace } from '../models/marketplace.model.js';
import { User } from '../models/user.model.js';
import cloudinary from '../utils/cloudinary.js';

// Placeholder images for different categories
const placeholderImages = {
  'Books': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80',
  'Sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
  'Home & Garden': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80',
  'Clothing': 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80',
  'Vehicles': 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  'Services': 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
  'Other': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
};

// Helper function to ensure listings have images
const ensureListingImages = (listing) => {
  const listingObj = listing.toObject ? listing.toObject() : listing;
  if (!listingObj.images || listingObj.images.length === 0) {
    listingObj.images = [placeholderImages[listingObj.category] || placeholderImages['Other']];
  }
  return listingObj;
};

export const createListing = async (req, res) => {
  try {
    const sellerId = req.id;
    const { title, description, category, price, location } = req.body;

    console.log('=== CREATE LISTING REQUEST ===');
    console.log('Seller ID:', sellerId);
    console.log('Body:', { title, description, category, price, location });
    console.log('Files received:', req.files?.length || 0);

    if (!title || !description || !category || !price || !location) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Handle image upload - same as posts
    let images = [];
    if (req.files && req.files.length > 0) {
      console.log('Processing', req.files.length, 'images...');
      for (const file of req.files) {
        try {
          console.log('Uploading file:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);
          
          // Optimize with sharp if available
          let optimizedImageBuffer;
          try {
            const mod = await import('sharp');
            const sharpLib = mod && mod.default ? mod.default : mod;
            optimizedImageBuffer = await sharpLib(file.buffer)
              .resize({ width: 1200, height: 1200, fit: 'inside' })
              .toFormat('jpeg', { quality: 85 })
              .toBuffer();
            console.log('Image optimized with sharp');
          } catch (e) {
            console.log('Sharp optimization skipped, using original buffer');
            optimizedImageBuffer = file.buffer;
          }

          // Buffer to data URI
          const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
          console.log('Data URI created, uploading to Cloudinary...');
          
          const cloudResponse = await cloudinary.uploader.upload(fileUri, {
            folder: 'marketplace',
            resource_type: 'image',
          });
          
          if (cloudResponse && cloudResponse.secure_url) {
            console.log('✓ Image uploaded successfully:', cloudResponse.secure_url);
            images.push(cloudResponse.secure_url);
          }
        } catch (err) {
          console.error('✗ Error uploading image:', err.message);
          console.error('Full error:', err);
        }
      }
    } else {
      console.log('No files to upload');
    }

    console.log('Total images uploaded:', images.length);
    console.log('Image URLs:', images);

    const listing = await Marketplace.create({
      title,
      description,
      category,
      price: parseFloat(price),
      location,
      images,
      seller: sellerId,
    });

    console.log('Listing created with ID:', listing._id);
    console.log('Images in listing:', listing.images);

    await listing.populate('seller', 'username profilePicture');

    return res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      listing,
    });
  } catch (error) {
    console.log('CREATE LISTING ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllListings = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, available } = req.query;
    
    let filter = {};
    
    if (category && category !== 'All') {
      filter.category = category;
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (available === 'true') {
      filter.isAvailable = true;
      filter.isSold = false;
    }

    const listings = await Marketplace.find(filter)
      .populate('seller', 'username profilePicture')
      .sort({ createdAt: -1 });

    // Ensure all listings have images (add placeholders if needed)
    const listingsWithImages = listings.map(ensureListingImages);

    return res.json({
      success: true,
      listings: listingsWithImages,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const userId = req.id;

    const listings = await Marketplace.find({ seller: userId })
      .populate('seller', 'username profilePicture')
      .sort({ createdAt: -1 });

    // Ensure all listings have images (add placeholders if needed)
    const listingsWithImages = listings.map(ensureListingImages);

    return res.json({
      success: true,
      listings: listingsWithImages,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Marketplace.findById(id)
      .populate('seller', 'username profilePicture bio');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Ensure listing has images (add placeholder if needed)
    const listingWithImages = ensureListingImages(listing);

    return res.json({
      success: true,
      listing: listingWithImages,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateListing = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;
    const { title, description, category, price, location, isAvailable, existingImages } = req.body;

    console.log('=== UPDATE LISTING REQUEST ===');
    console.log('User ID:', userId);
    console.log('Listing ID:', id);
    console.log('Body:', { title, description, category, price, location, isAvailable });
    console.log('Existing images param:', existingImages);
    console.log('Files received:', req.files?.length || 0);

    const listing = await Marketplace.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    if (String(listing.seller) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    console.log('Current listing images:', listing.images);

    if (title) listing.title = title;
    if (description) listing.description = description;
    if (category) listing.category = category;
    if (price) listing.price = parseFloat(price);
    if (location) listing.location = location;
    if (typeof isAvailable !== 'undefined') listing.isAvailable = isAvailable;

    // Handle image updates
    let updatedImages = [];
    
    // Keep existing images that weren't removed
    if (existingImages) {
      try {
        updatedImages = JSON.parse(existingImages);
        console.log('Parsed existing images:', updatedImages);
      } catch (e) {
        console.log('Error parsing existingImages:', e);
        updatedImages = [];
      }
    }

    console.log('Files received:', req.files?.length || 0);

    // Upload new images if provided - same as posts
    if (req.files && req.files.length > 0) {
      console.log('Uploading', req.files.length, 'new images');
      for (const file of req.files) {
        try {
          console.log('Uploading file:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);
          
          // Optimize with sharp if available
          let optimizedImageBuffer;
          try {
            const mod = await import('sharp');
            const sharpLib = mod && mod.default ? mod.default : mod;
            optimizedImageBuffer = await sharpLib(file.buffer)
              .resize({ width: 1200, height: 1200, fit: 'inside' })
              .toFormat('jpeg', { quality: 85 })
              .toBuffer();
            console.log('Image optimized with sharp');
          } catch (e) {
            console.log('Sharp optimization skipped, using original buffer');
            optimizedImageBuffer = file.buffer;
          }

          // Buffer to data URI
          const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
          console.log('Data URI created, uploading to Cloudinary...');
          
          const cloudResponse = await cloudinary.uploader.upload(fileUri, {
            folder: 'marketplace',
            resource_type: 'image',
          });
          
          if (cloudResponse && cloudResponse.secure_url) {
            console.log('✓ Image uploaded successfully:', cloudResponse.secure_url);
            updatedImages.push(cloudResponse.secure_url);
          }
        } catch (err) {
          console.error('✗ Error uploading image:', err.message);
          console.error('Full error:', err);
        }
      }
    }

    // Limit to 5 images
    listing.images = updatedImages.slice(0, 5);
    console.log('Final images count:', listing.images.length);
    console.log('Final image URLs:', listing.images);

    await listing.save();
    await listing.populate('seller', 'username profilePicture');

    console.log('Listing updated successfully');

    return res.json({
      success: true,
      message: 'Listing updated successfully',
      listing,
    });
  } catch (error) {
    console.log('UPDATE LISTING ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markAsSold = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;

    const listing = await Marketplace.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    if (String(listing.seller) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    listing.isSold = true;
    listing.isAvailable = false;
    await listing.save();

    return res.json({
      success: true,
      message: 'Listing marked as sold',
      listing,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteListing = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;

    const listing = await Marketplace.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    if (String(listing.seller) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await Marketplace.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
