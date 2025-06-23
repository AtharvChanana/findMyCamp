const mongoose = require('mongoose');
const User = require('../models/user');

const MONGODB_URI = 'mongodb+srv://atharv:Atharv1418@cluster0.hhcdn4p.mongodb.net/findMyCamp?retryWrites=true&w=majority&appName=Cluster0';

async function createAdmin() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete any existing admin user with username 'admin' (case-insensitive)
    await User.deleteMany({ username: { $regex: /^admin$/i } });
    console.log('Deleted any existing admin user with username "admin" (case-insensitive)');

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