// Load environment variables first
require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const flash = require('connect-flash');

// Import models
const Campground = require('./models/campground');
const User = require('./models/user');

// Import utilities
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const { campgroundSchema } = require('./schemas.js');

// Set port
const port = process.env.PORT || 3000;

// MongoDB Configuration
const mongoConfig = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,  // 30 seconds
    socketTimeoutMS: 45000,           // 45 seconds
    connectTimeoutMS: 30000,          // 30 seconds
    retryWrites: true,
    w: 'majority'
};

// Set strict query mode
mongoose.set('strictQuery', false);

// Connection state
let isConnected = false;

// Connection events
mongoose.connection.on('connecting', () => {
    console.log('🔄 Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
    console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   - Host: ${mongoose.connection.host}`);
    console.log(`   - Database: ${mongoose.connection.name}`);
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
    if (err.name === 'MongooseServerSelectionError') {
        console.error('   - Could not connect to any MongoDB servers');
        console.error('   - Please check your MongoDB Atlas connection string and IP whitelist');
    }
});

mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.log('ℹ️  MongoDB disconnected');
});

// Database connection function
const connectDB = async () => {
    // If already connected, return the existing connection
    if (isConnected) {
        console.log('ℹ️  Using existing database connection');
        return mongoose.connection;
    }

    try {
        const dbUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';
        console.log('🔗 Connecting to MongoDB...');
        
        await mongoose.connect(dbUrl, mongoConfig);
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        if (process.env.NODE_ENV === 'production') {
            console.log('🔄 Retrying in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            return connectDB();
        } else {
            console.error('💡 Tip: Make sure your MongoDB is running locally or check your connection string');
            process.exit(1);
        }
    }
};

// Session configuration
const sessionConfig = {
    name: 'findMyCampSession',
    secret: process.env.SESSION_SECRET || 'fallback_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp',
        touchAfter: 24 * 3600, // time period in seconds (1 day)
        autoRemove: 'native' // remove expired sessions
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,  // 1 week
        maxAge: 1000 * 60 * 60 * 24 * 7,               // 1 week
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
};

app.use(session(sessionConfig));

// Flash messages
app.use(flash());

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Set variables for all views
app.use((req, res, next) => {
    // Set current path for active link highlighting
    res.locals.currentPath = req.path;
    res.locals.currentPage = '';
    // Set current user for all views
    res.locals.currentUser = req.user;
    // Flash messages
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Set view engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const authRoutes = require('./routes/auth');
const campgroundRoutes = require('./routes/campgrounds');

// Auth routes
app.use('/', authRoutes);
app.use('/campgrounds', campgroundRoutes);

// Start the server only after MongoDB connection is established
const startServer = async () => {
    try {
        const connection = await connectDB();
        
        // Get the HTTP server instance
        const server = app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
            const { address, port } = server.address();
            console.log(`\n🚀 Server is running on http://${address === '::' ? 'localhost' : address}:${port}`);
            console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   - Database: ${connection?.name || 'Not connected'}`);
            console.log(`   - Press Ctrl+C to stop\n`);
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${process.env.PORT || 3000} is already in use.`);
            } else {
                console.error('❌ Server error:', error.message);
            }
            process.exit(1);
        });

        // Handle process termination
        const shutdown = async () => {
            console.log('\n🔴 Shutting down server...');
            server.close(async () => {
                console.log('🔌 Server closed');
                if (mongoose.connection.readyState === 1) {
                    await mongoose.connection.close(false);
                    console.log('🔌 MongoDB connection closed');
                }
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the application
startServer();

// Handle process termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
});

// Home route
app.get('/', (req, res) => {
    res.locals.currentPage = 'home';
    res.render('home/index');
});

app.get('/campgrounds', catchAsync(async (req, res) => {
    const { search, sort } = req.query;
    let query = {};
    let sortOption = {};
    
    // Handle search
    if (search) {
        query = {
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };
    }
    
    // Handle sorting
    if (sort) {
        switch (sort) {
            case 'price_asc':
                sortOption = { price: 1 }; // Sort by price low to high
                break;
            case 'price_desc':
                sortOption = { price: -1 }; // Sort by price high to low
                break;
            case 'rating_desc':
                sortOption = { rating: -1 }; // Sort by rating high to low
                break;
            case 'rating_asc':
                sortOption = { rating: 1 }; // Sort by rating low to high
                break;
            case 'newest':
                sortOption = { _id: -1 }; // Sort by newest first
                break;
            case 'oldest':
                sortOption = { _id: 1 }; // Sort by oldest first
                break;
            default:
                sortOption = { _id: -1 }; // Default sort by newest
        }
    } else {
        sortOption = { _id: -1 }; // Default sort by newest if no sort specified
    }
    
    const campgrounds = await Campground.find(query).sort(sortOption);
    res.render('campgrounds/index', { 
        campgrounds, 
        searchQuery: search,
        currentSort: sort || 'newest',
        req: req // Pass the request object to the view
    });
}))

app.get('/campgrounds/new',(req,res)=>{
    res.render('campgrounds/new')
})

const validateCampground = (req,res,next)=>{
    const {error} = campgroundSchema.validate(req.body)
    if(error) {
        const msg = error.details.map(el=>el.message).join(',')
        throw new ExpressError(msg,400)
    }
    else{
        next()
    }
}

app.post('/campgrounds', validateCampground, catchAsync(async(req,res)=>{
    const campground = new Campground(req.body.campground)
    await campground.save()
    res.redirect(`/campgrounds/${campground.id}`)
}))

app.get('/campgrounds/:id',catchAsync(async(req,res)=>{
    const {id} = req.params
    const campground = await Campground.findById(id)
    res.render('campgrounds/show',{campground})
}))
app.get('/campgrounds/:id/edit',catchAsync(async(req,res)=>{
    const {id} = req.params
    const campground = await Campground.findById(id)
    res.render('campgrounds/edit',{campground})
}))
app.put('/campgrounds/:id', validateCampground, catchAsync(async(req,res)=>{
    const {id} = req.params
    const campground = await Campground.findByIdAndUpdate(id,{...req.body.campground})
    res.redirect(`/campgrounds/${campground.id}`)
}))
app.delete('/campgrounds/:id',catchAsync(async(req,res)=>{
    const {id} = req.params
    await Campground.findByIdAndDelete(id)
    res.redirect('/campgrounds')
}))
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found',404))
})
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Oh no, Something Went Wrong';
    
    // Log the error for debugging
    console.error('Error:', err);
    
    // Render the error page with the error details
    res.status(statusCode).render('error', { 
        statusCode,
        message,
        err: process.env.NODE_ENV === 'development' ? err : null
    });
});
// 404 Handler
app.use((req, res, next) => {
    res.status(404).render('error', { 
        title: '404 - Not Found',
        message: 'The page you are looking for does not exist.' 
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('ERROR:', err);
    const { statusCode = 500, message = 'Something went wrong!' } = err;
    
    // Log the full error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error Stack:', err.stack);
        return res.status(statusCode).json({
            error: {
                message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
                status: statusCode
            }
        });
    }
    
    // Production error handling
    res.status(statusCode).render('error', {
        title: `${statusCode} Error`,
        message
    });
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});