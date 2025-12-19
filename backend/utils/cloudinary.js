import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import { PassThrough } from 'stream';
dotenv.config({});

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

// During tests we prefer not to call the real Cloudinary service.
// When running under NODE_ENV=test, export a small shim that returns
// a deterministic secure_url so tests don't depend on network.
let cloudinaryExport = cloudinary;
if (String(process.env.NODE_ENV || '').toLowerCase() === 'test') {
    cloudinaryExport = {
        uploader: {
            upload: async (fileUri) => {
                return { secure_url: 'http://example.com/test-image.png' };
            },
            // Provide upload_stream so tests that use stream-based uploads still work
            upload_stream: (callback) => {
                const pass = new PassThrough();
                pass.on('end', () => {
                    // Return the same deterministic result when stream ends
                    callback(null, { secure_url: 'http://example.com/test-image.png' });
                });
                return pass;
            },
        },
    };
}

export default cloudinaryExport;

// Helper to upload a local file path to Cloudinary and return the secure_url
export const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) return null;
    try {
        const result = await cloudinaryExport.uploader.upload(localFilePath, {
            resource_type: 'auto',
        });
        // Clean up temp file if it exists
        try { fs.unlinkSync(localFilePath); } catch (e) {}
        return result;
    } catch (error) {
        // Ensure temp file is removed even on failure
        try { fs.unlinkSync(localFilePath); } catch (e) {}
        throw error;
    }
};