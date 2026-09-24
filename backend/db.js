const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    if (!MONGO_URI) {
        console.error('❌ MONGO_URI is not defined in environment variables.');
        return;
    }

    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB Atlas:', mongoose.connection.name);
    } catch (err) {
        console.error('❌ MongoDB initial connection failed:', err.message);
        console.log('🔄 Will retry connection automatically in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

mongoose.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to:', mongoose.connection.host);
});

mongoose.connection.on('error', (err) => {
    console.error('⚠️  Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('🔌 Mongoose disconnected from MongoDB. Reconnecting...');
});

process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
    } catch {}
    process.exit(0);
});

module.exports = connectDB;
