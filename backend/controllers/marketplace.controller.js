import { Marketplace } from '../models/marketplace.model.js';
import { User } from '../models/user.model.js';
import cloudinary from '../utils/cloudinary.js';

export const createListing = async (req, res) => {
  try {
    const sellerId = req.id;
    const { title, description, category, price, location } = req.body;

    if (!title || !description || !category || !price || !location) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Handle image upload - convert buffers to data URIs and upload to cloudinary
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // Convert buffer to base64 data URI
          const fileUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          const cloudResponse = await cloudinary.uploader.upload(fileUri, {
            resource_type: 'auto',
          });
          if (cloudResponse && cloudResponse.secure_url) {
            images.push(cloudResponse.secure_url);
          }
        } catch (err) {
          console.error('Error uploading image:', err);
        }
      }
    }

    const listing = await Marketplace.create({
      title,
      description,
      category,
      price: parseFloat(price),
      location,
      images,
      seller: sellerId,
    });

    await listing.populate('seller', 'username profilePicture');

    return res.status(201).json({
      success: true,
      message: 'Listing created successfully',
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

    return res.json({
      success: true,
      listings,
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

    return res.json({
      success: true,
      listings,
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

    return res.json({
      success: true,
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

export const updateListing = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;
    const { title, description, category, price, location, isAvailable, existingImages } = req.body;

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

    // Upload new images if provided
    if (req.files && req.files.length > 0) {
      console.log('Uploading', req.files.length, 'new images');
      for (const file of req.files) {
        try {
          // Convert buffer to base64 data URI
          const fileUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          const cloudResponse = await cloudinary.uploader.upload(fileUri, {
            resource_type: 'auto',
          });
          if (cloudResponse && cloudResponse.secure_url) {
            console.log('Image uploaded successfully:', cloudResponse.secure_url);
            updatedImages.push(cloudResponse.secure_url);
          }
        } catch (err) {
          console.error('Error uploading image:', err);
        }
      }
    }

    // Limit to 5 images
    listing.images = updatedImages.slice(0, 5);
    console.log('Final images count:', listing.images.length);

    await listing.save();
    await listing.populate('seller', 'username profilePicture');

    return res.json({
      success: true,
      message: 'Listing updated successfully',
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
