const mongoose = require('mongoose');
const User = require('../models/user');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const setAdminFlag = async () => {
    try {
        const admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            console.log('❌ No user with username "admin" found.');
        } else {
            admin.isAdmin = true;
            await admin.save();
            console.log('✅ Admin flag set for user "admin".');
        }
    } catch (err) {
        console.error('Error setting admin flag:', err);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
};

setAdminFlag(); 