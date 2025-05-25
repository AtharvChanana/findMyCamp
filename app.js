const express = require('express')
const app = express()
const path = require('path')
const Campground = require('./models/campground')
const User = require('./models/user')
const mongoose = require('mongoose')
const catchAsync = require('./utils/catchAsync')
const ExpressError = require('./utils/ExpressError')
const {campgroundSchema} = require('./schemas.js')
const methodOverride = require('method-override')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const flash = require('connect-flash')
const passportLocalMongoose = require('passport-local-mongoose')

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'fallback_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
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
app.engine('ejs', ejsMate)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Routes
const authRoutes = require('./routes/auth');
const campgroundRoutes = require('./routes/campgrounds');

// Auth routes
app.use('/', authRoutes);
app.use('/campgrounds', campgroundRoutes);

main().catch(err => console.log(err));

// Load environment variables
require('dotenv').config();

async function main() {
    const dbUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/yelp-camp';
    await mongoose.connect(dbUrl);
    console.log('MONGO CONNECTION OPEN')
}

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
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})