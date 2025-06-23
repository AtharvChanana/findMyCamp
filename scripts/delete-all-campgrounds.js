const mongoose = require('mongoose');
const Campground = require('../models/campground');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

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