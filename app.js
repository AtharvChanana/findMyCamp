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
        sslValidate: true,
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

// Routes
const authRoutes = require('./routes/auth');
const campgroundRoutes = require('./routes/campgrounds');

// Auth routes
app.use('/', authRoutes);
app.use('/campgrounds', campgroundRoutes);

// Start the server only after MongoDB connection is established
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Initialize session store after database connection
        const store = MongoStore.create({
            mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findMyCamp',
            touchAfter: 24 * 60 * 60, // 1 day
            crypto: {
                secret: process.env.SESSION_SECRET || 'fallback_secret_key'
            }
        });

        store.on('error', function(e) {
            console.error('Session store error:', e);
        });

        // Configure session
        sessionConfig = {
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
        
        // Routes
        app.get('/', (req, res) => {
            res.locals.currentPage = 'home';
            res.render('home/index');
        });
        
        // Campground routes
        const campgroundRoutes = require('./routes/campgrounds');
        app.use('/campgrounds', campgroundRoutes);
        
        // Review routes
        // const reviewRoutes = require('./routes/reviews');
        // app.use('/campgrounds/:id/reviews', reviewRoutes);
        
        // Auth routes
        const authRoutes = require('./routes/auth');
        app.use('/', authRoutes);  // Mount auth routes at the root
        
        // 404 handler
        app.all('*', (req, res, next) => {
            next(new ExpressError('Page Not Found', 404));
        });
        
        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error('Error:', err);
            const statusCode = err.statusCode || 500;
            const message = err.message || 'Something went wrong!';
            
            // Set default values for template
            res.locals.statusCode = statusCode;
            res.locals.message = message;
            
            if (req.accepts('html')) {
                // Render error page for HTML responses
                res.status(statusCode).render('error', { 
                    statusCode,
                    message,
                    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
                });
            } else if (req.accepts('json')) {
                // Send JSON response for API requests
                res.status(statusCode).json({ 
                    error: {
                        status: statusCode,
                        message: message
                    }
                });
            } else {
                // Default to plain text
                res.status(statusCode).type('txt').send(`${statusCode}: ${message}`);
            }
        });
        
        // Start server
        const server = app.listen(port, '0.0.0.0', () => {
            console.log(`Server is running on port ${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   - MongoDB: ${dbConnection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
        });
        
        // Handle server errors
        server.on('error', (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }
            
            const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
            
            // Handle specific listen errors with friendly messages
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
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            console.error('Unhandled Rejection! Shutting down...');
            console.error(err.name, err.message);
            server.close(() => {
                process.exit(1);
            });
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception! Shutting down...');
            console.error(err.name, err.message);
            server.close(() => {
                process.exit(1);
            });
        });
        
        // Handle graceful shutdown
        const shutdown = async () => {
            console.log('\n🔴 Shutting down server...');
            
            // Close the server
            server.close(async () => {
                console.log('🔌 HTTP server closed');
                
                // Close MongoDB connection if connected
                if (dbConnection.readyState === 1) {
                    try {
                        await dbConnection.close();
                        console.log('🔌 MongoDB connection closed');
                    } catch (err) {
                        console.error('❌ Error closing MongoDB connection:', err.message);
                    }
                }
                
                process.exit(0);
            });
            
            // Force exit if server doesn't close in time
            setTimeout(() => {
                console.log('⚠️  Forcing server shutdown...');
                process.exit(0);
            }, 5000);
        };

        // Handle process termination
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        console.error('❌ Failed to start server:', error);
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