const mongoose = require('mongoose');
require('dotenv').config();
const Campground = require('../models/campground');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';
const isAtlas = MONGODB_URI.includes('mongodb+srv://');

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    minPoolSize: 5,
    ...(isAtlas && {
        tls: true,
        tlsCAFile: '/etc/ssl/certs/ca-certificates.crt',
        tlsAllowInvalidHostnames: false,
        minTlsVersion: 'TLSv1.2',
        maxTlsVersion: 'TLSv1.3'
    })
});

const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://');
};

const deleteAllCampgrounds = async () => {
    try {
        const result = await Campground.deleteMany({});
        console.log(`🗑️ Deleted ${result.deletedCount} campgrounds from the database.`);
    } catch (err) {
        console.error('Error deleting campgrounds:', err);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
};

deleteAllCampgrounds(); 