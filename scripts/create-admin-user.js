const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';

async function createAdmin() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete any existing admin user with username 'admin'
    await User.deleteMany({ username: 'admin' });
    console.log('Deleted any existing admin user with username "admin"');

    // Register new admin user
    User.register(new User({ username: 'admin', isAdmin: true }), 'Admin@1234', function(err, user) {
        if (err) {
            console.error('Error creating admin user:', err);
        } else {
            console.log('Admin user created successfully:', user);
        }
        mongoose.connection.close();
    });
}

createAdmin(); 