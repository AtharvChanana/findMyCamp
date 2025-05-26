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

// Import utilities
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const { campgroundSchema } = require('./schemas.js');

// Set port
const port = process.env.PORT || 3000;

// Set strict query mode
mongoose.set('strictQuery', false);

// Configure session store with MongoDB connection options
const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp',
    mongoOptions: {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        ssl: process.env.NODE_ENV === 'production',
        sslValidate: process.env.NODE_ENV === 'production',
        retryWrites: true,
        w: 'majority'
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
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
};

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize session middleware
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

// Validation middleware
const validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
};

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

app.get('/campgrounds/new', (req, res) => {
    res.render('campgrounds/new');
});

app.post('/campgrounds', validateCampground, catchAsync(async (req, res) => {
    const campground = new Campground(req.body.campground);
    await campground.save();
    res.redirect(`/campgrounds/${campground.id}`);
}));

app.get('/campgrounds/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    res.render('campgrounds/show', { campground });
}));

app.get('/campgrounds/:id/edit', catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    res.render('campgrounds/edit', { campground });
}));

app.put('/campgrounds/:id', validateCampground, catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    res.redirect(`/campgrounds/${campground.id}`);
}));

app.delete('/campgrounds/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
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