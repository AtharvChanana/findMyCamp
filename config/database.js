const mongoose = require('mongoose');

// MongoDB Configuration
const mongoConfig = {
    serverSelectionTimeoutMS: 30000,  // 30 seconds
    socketTimeoutMS: 45000,           // 45 seconds
    connectTimeoutMS: 30000,          // 30 seconds
    retryWrites: true,
    w: 'majority'
};

// Add SSL options for production
if (process.env.NODE_ENV === 'production') {
    Object.assign(mongoConfig, {
        ssl: true,
        sslValidate: true
    });
}

// Connection state
let isConnecting = false;

// Connection events
mongoose.connection.on('connecting', () => {
    console.log('🔄 Connecting to MongoDB...');    
    isConnecting = true;
});

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
    console.log(`   - Host: ${mongoose.connection.host}`);
    console.log(`   - Database: ${mongoose.connection.name}`);
    isConnecting = false;
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
    if (err.name === 'MongoNetworkError') {
        console.error('   - Could not connect to any MongoDB servers');
        console.error('   - Please check your MongoDB Atlas connection string and IP whitelist');
    }
    isConnecting = false;
});

mongoose.connection.on('disconnected', () => {
    console.log('ℹ️  MongoDB disconnected');
});

// Database connection function
const connectDB = async (dbUrl = null) => {
    // If already connected, return the existing connection
    if (mongoose.connection.readyState === 1) {
        console.log('ℹ️  Using existing database connection');
        return mongoose.connection;
    }
    
    // Get the MongoDB URI from environment or use default
    const MONGODB_URI = dbUrl || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';
    
    // Check if we're connecting to Atlas
    const isAtlas = MONGODB_URI.includes('mongodb+srv://');
    
    // Log connection attempt
    console.log(`🌐 Connecting to ${isAtlas ? 'MongoDB Atlas' : 'local MongoDB'}...`);
    console.log(`   - URI: ${MONGODB_URI.split('@').pop()}`); // Don't log credentials

    // If already trying to connect, wait for the connection
    if (isConnecting) {
        console.log('ℹ️  Already connecting to MongoDB, waiting...');
        return new Promise((resolve, reject) => {
            const checkConnection = () => {
                if (mongoose.connection.readyState === 1) {
                    resolve(mongoose.connection);
                } else if (mongoose.connection.readyState === 0) {
                    reject(new Error('Failed to connect to MongoDB'));
                } else {
                    setTimeout(checkConnection, 100);
                }
            };
            checkConnection();
        });
    }

    // Start a new connection
    try {
        console.log('🔗 Establishing new MongoDB connection...');
        await mongoose.connect(MONGODB_URI, mongoConfig);
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        if (process.env.NODE_ENV === 'production') {
            console.log('🔄 Retrying in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            return connectDB();
        } else {
            console.error('💡 Tip: Make sure your MongoDB is running locally or check your connection string');
            throw error;
        }
    }
};

// Graceful shutdown
const closeConnection = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close(false);
            console.log('MongoDB connection closed');
        }
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeConnection();
    process.exit(0);
});

module.exports = {
    connectDB,
    closeConnection,
    connection: mongoose.connection
};
