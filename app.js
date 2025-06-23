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

// Import database configuration
const { connectDB, connection: dbConnection } = require('./config/database');

// Import models
const Campground = require('./models/campground');
const User = require('./models/user');

// Import utilities and middleware
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const { isLoggedIn, isAuthor, validateCampground } = require('./middleware');
const { campgroundSchema } = require('./schemas.js');

// Set port
const port = process.env.PORT || 3000;

// Set strict query mode
mongoose.set('strictQuery', false);

// Check if we're connecting to Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp';
const isAtlas = MONGODB_URI.includes('mongodb+srv://');

// Configure session store with MongoDB connection options
const sessionStore = MongoStore.create({
    mongoUrl: MONGODB_URI,
    mongoOptions: {
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
            tlsAllowInvalidHostnames: false
        })
    },
    touchAfter: 24 * 60 * 60, // 1 day - time period in seconds
    crypto: { 
        secret: process.env.SESSION_SECRET || 'fallback_secret_key' 
    }
});

// Session configuration
const sessionConfig = {
    name: 'findMyCampSession',
    secret: process.env.SESSION_SECRET || 'fallback_secret_key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: 'lax'
    }
};

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize session middleware
app.set('trust proxy', 1);
app.use(session(sessionConfig));
app.use(flash());

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Make user and currentPath available to all templates
app.use((req, res, next) => {
    console.log('Current user:', req.user);
    res.locals.currentUser = req.user;
    res.locals.currentPath = req.path;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Set view engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.locals.currentPage = 'home';
    res.render('home/index');
});

// Mount route modules
const authRoutes = require('./routes/auth');
const campgroundRoutes = require('./routes/campgrounds');

app.use('/', authRoutes);
app.use('/campgrounds', campgroundRoutes);

// Campground routes that haven't been moved to the router yet
app.get('/campgrounds', catchAsync(async (req, res) => {
    const { search, sort } = req.query;
    let query = {};
    let sortOption = {};
    
    if (search) {
        query = {
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };
    }
    
    if (sort) {
        switch (sort) {
            case 'price_asc': sortOption = { price: 1 }; break;
            case 'price_desc': sortOption = { price: -1 }; break;
            case 'rating_desc': sortOption = { rating: -1 }; break;
            case 'rating_asc': sortOption = { rating: 1 }; break;
            case 'newest': sortOption = { _id: -1 }; break;
            case 'oldest': sortOption = { _id: 1 }; break;
            default: sortOption = { _id: -1 };
        }
    } else {
        sortOption = { _id: -1 };
    }
    
    const campgrounds = await Campground.find(query).sort(sortOption);
    res.render('campgrounds/index', { 
        campgrounds, 
        searchQuery: search,
        currentSort: sort || 'newest',
        req: req
    });
}));

// Protected route - require login to create campground
app.get('/campgrounds/new', isLoggedIn, (req, res) => {
    res.render('campgrounds/new');
});

// Protected route - require login to create campground
app.post('/campgrounds', isLoggedIn, validateCampground, catchAsync(async (req, res) => {
    const campground = new Campground(req.body.campground);
    campground.author = req.user._id;
    await campground.save();
    req.flash('success', 'Successfully made a new campground!');
    res.redirect(`/campgrounds/${campground.id}`);
}));

app.get('/campgrounds/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id).populate('author');
    res.render('campgrounds/show', { campground });
}));

// Protected route - require login and ownership to edit
app.get('/campgrounds/:id/edit', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    res.render('campgrounds/edit', { campground });
}));

// Protected route - require login and ownership to update
app.put('/campgrounds/:id', isLoggedIn, isAuthor, validateCampground, catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    req.flash('success', 'Successfully updated campground!');
    res.redirect(`/campgrounds/${campground.id}`);
}));

// Protected route - require login and ownership or admin to delete
app.delete('/campgrounds/:id', isLoggedIn, (req, res, next) => {
    if (req.user.isAdmin) return next();
    return isAuthor(req, res, next);
}, catchAsync(async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted campground!');
    res.redirect('/campgrounds');
}));

// 404 handler - Keep only one
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
});

// Error handling middleware - Keep only one
app.use((err, req, res, next) => {
    console.error('Error:', err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Something went wrong!';
    
    if (process.env.NODE_ENV === 'development') {
        console.error('Error Stack:', err.stack);
    }
    
    res.status(statusCode);
    
    if (req.accepts('html')) {
        res.render('error', { 
            title: `${statusCode} Error`,
            statusCode,
            message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    } else if (req.accepts('json')) {
        res.json({
            error: {
                status: statusCode,
                message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            }
        });
    } else {
        res.type('txt').send(`${statusCode}: ${message}`);
    }
});

// Start the server
const startServer = async () => {
    try {
        await connectDB();
        
        const server = app.listen(port, '0.0.0.0', () => {
            console.log(`Server is running on port ${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`MongoDB: ${dbConnection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }
            
            const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
            
            switch (error.code) {
                case 'EACCES':
                    console.error(bind + ' requires elevated privileges');
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    console.error(bind + ' is already in use');
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

// Start the server
startServer();