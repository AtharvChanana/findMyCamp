const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';

async function setAdminFlag() {
    await mongoose.connect(MONGODB_URI);
    const result = await User.updateOne({ username: 'admin' }, { $set: { isAdmin: true } });
    if (result.modifiedCount > 0) {
        console.log('Admin flag set for user "admin".');
    } else {
        console.log('No user "admin" found or already admin.');
    }
    mongoose.connection.close();
}

setAdminFlag(); 