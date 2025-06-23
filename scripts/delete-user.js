const mongoose = require('mongoose');
const User = require('../models/user');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const usernameToDelete = 'admin'; // Change this to the username you want to delete

const deleteUser = async () => {
    try {
        const result = await User.deleteOne({ username: usernameToDelete });
        if (result.deletedCount === 0) {
            console.log(`❌ No user found with username: ${usernameToDelete}`);
        } else {
            console.log(`✅ User '${usernameToDelete}' deleted successfully.`);
        }
    } catch (err) {
        console.error('Error deleting user:', err);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
};

deleteUser(); 