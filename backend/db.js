import mongoose from "mongoose";

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB Atlas...');
        
        // Special configuration for Node.js v24
        const uri = process.env.MONGO_URI || '';
        const isSrv = uri.startsWith('mongodb+srv');
        const connectOptions = {
            serverSelectionTimeoutMS: 30000,
        };
        if (isSrv) {
            connectOptions.tls = true;
            connectOptions.tlsAllowInvalidCertificates = true;
        }
        await mongoose.connect(uri, connectOptions);
        
        console.log('✅ MongoDB connected successfully');
        console.log('Connected to:', mongoose.connection.host);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        throw error;
    }
};

export default connectDB;