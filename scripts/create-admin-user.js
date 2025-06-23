const mongoose = require('mongoose');
const User = require('../models/user');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const createAdmin = async () => {
    try {
        let admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            admin = new User({
                username: 'admin',
                email: 'admin@example.com',
                isAdmin: true
            });
            await User.register(admin, 'Admin@1234');
            console.log('✅ Admin user created: admin / Admin@1234');
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

createAdmin(); 