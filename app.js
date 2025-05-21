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
app.use(session({
    secret: 'yelpcamp_secret',
    resave: false,
    saveUninitialized: true
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash messages
app.use(flash());

// Add user to locals
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Middleware
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')))

// Set variables for all views
app.use((req, res, next) => {
    // Set current path for active link highlighting
    res.locals.currentPath = req.path;
    res.locals.currentPage = '';
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

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp');
    console.log('MONGO CONNECTION OPEN')
}

// Home route
app.get('/', (req, res) => {
    res.locals.currentPage = 'home';
    res.render('home/index');
});

app.get('/campgrounds', catchAsync(async (req, res) => {
    const { search } = req.query;
    let query = {};
    
    if (search) {
        // Search in title, location, or description using regex
        query = {
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };
    }
    
    const campgrounds = await Campground.find(query);
    res.render('campgrounds/index', { 
        campgrounds,
        searchQuery: search || ''
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
app.listen(3000,()=>{
    console.log('LISTENING AT 3000')
})