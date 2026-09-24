const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
}

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas:', mongoose.connection.name);
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.log('💡 Check your MONGO_URI in .env and ensure your IP is whitelisted on Atlas.');
        process.exit(1);
    }
};

// Listen for connection events dynamically
mongoose.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to:', mongoose.connection.host);
});

mongoose.connection.on('error', (err) => {
    console.error('⚠️  Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('🔌 Mongoose disconnected from MongoDB.');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed (SIGINT).');
    process.exit(0);
});

module.exports = connectDB;
