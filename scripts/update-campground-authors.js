const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Campground = require('../models/campground');
const User = require('../models/user');

// Connect to MongoDB
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
    // Only add TLS options for Atlas connections
    ...(isAtlas && {
        tls: true,
        tlsCAFile: '/etc/ssl/certs/ca-certificates.crt',
        tlsAllowInvalidHostnames: false,
        minTlsVersion: 'TLSv1.2',
        maxTlsVersion: 'TLSv1.3'
    })
});

const updateCampgroundAuthors = async () => {
    try {
        console.log('🔍 Checking for campgrounds without authors...');
        
        // Find campgrounds without authors
        const campgroundsWithoutAuthors = await Campground.find({ author: { $exists: false } });
        
        if (campgroundsWithoutAuthors.length === 0) {
            console.log('✅ All campgrounds already have authors assigned.');
            return;
        }
        
        console.log(`📝 Found ${campgroundsWithoutAuthors.length} campground(s) without authors.`);
        
        // Get the first user (or create a default one if none exists)
        let defaultUser = await User.findOne();
        
        if (!defaultUser) {
            console.log('⚠️  No users found. Creating a default user...');
            defaultUser = new User({
                username: 'default_user',
                email: 'default@example.com'
            });
            await User.register(defaultUser, 'defaultPassword123!');
            console.log('✅ Created default user.');
        }
        
        // Update campgrounds without authors
        for (const campground of campgroundsWithoutAuthors) {
            await Campground.findByIdAndUpdate(campground._id, { author: defaultUser._id });
            console.log(`✅ Assigned author to campground: ${campground.title}`);
        }
        
        console.log('🎉 Successfully updated all campgrounds with authors!');
        
    } catch (error) {
        console.error('❌ Error updating campground authors:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
};

const createAdmin = async () => {
    try {
        let admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            admin = new User({
                username: 'admin',
                email: 'admin@example.com',
                isAdmin: true
            });
            await User.register(admin, 'admin1234');
            console.log('✅ Admin user created: admin / admin1234');
        } else {
            admin.isAdmin = true;
            await admin.save();
            console.log('ℹ️ Admin user already exists. isAdmin set to true.');
        }
    } catch (err) {
        console.error('Error creating admin user:', err);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
};

// Run the script
updateCampgroundAuthors();
createAdmin(); 