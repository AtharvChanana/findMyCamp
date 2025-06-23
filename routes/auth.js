const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const { check, validationResult } = require('express-validator');

// Login page
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/campgrounds');
    }
    res.render('auth/login', { 
        error: req.flash('error'),
        success: req.flash('success'),
        title: 'Login | FindMyCamp',
        page: 'login'
    });
});

// Login form validation middleware
const validateLogin = [
    check('username')
        .trim()
        .escape()
        .notEmpty().withMessage('Username or email is required')
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
        .matches(/^[a-zA-Z0-9_@.]+$/).withMessage('Invalid characters in username or email'),
    check('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

// Helper function to render login page with error
const renderLoginError = (res, error, username = '') => {
    return res.render('auth/login', {
        title: 'Login | FindMyCamp',
        error: error,
        username: username,
        page: 'login'
    });
};

// Login form submission with validation and error handling
router.post('/login', validateLogin, (req, res, next) => {
    const { username, password } = req.body;
    const usernameLower = username ? username.toLowerCase().trim() : '';
    const errors = validationResult(req);
    
    // Handle validation errors
    if (!errors.isEmpty()) {
        return renderLoginError(res, errors.array()[0].msg, usernameLower);
    }
    
    if (!usernameLower || !password) {
        return renderLoginError(res, 'Username and password are required', usernameLower);
    }
    
    // Use passport's local strategy for authentication
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Authentication error:', err);
            return renderLoginError(res, 'An error occurred during authentication. Please try again.', usernameLower);
        }
        
        if (!user) {
            // Provide a generic error message to prevent username enumeration
            return renderLoginError(res, 'Invalid username or password', usernameLower);
        }
        
        // Check if account is active
        if (!user.isActive) {
            return renderLoginError(res, 'This account has been deactivated. Please contact support.', usernameLower);
        }
        
        // Log the user in
        req.logIn(user, async (err) => {
            if (err) {
                console.error('Login error:', err);
                return renderLoginError(res, 'An error occurred during login. Please try again.', usernameLower);
            }
            
            try {
                // Update last login time
                user.lastLogin = new Date();
                await user.save();
                
                // Set success message
                req.flash('success', `Welcome back, ${user.username}!`);
                
                // Redirect to the original URL or default
                const redirectTo = req.session.returnTo || '/campgrounds';
                delete req.session.returnTo;
                return res.redirect(redirectTo);
                
            } catch (updateError) {
                console.error('Error updating user after login:', updateError);
                // Even if update fails, still log the user in
                req.flash('success', `Welcome back, ${user.username}!`);
                return res.redirect('/campgrounds');
            }
        });
    })(req, res, next);
});

// Register page
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/campgrounds');
    }
    res.render('auth/register', { 
        error: req.flash('error'),
        success: req.flash('success'),
        title: 'Register | FindMyCamp',
        page: 'register',
        user: { username: '', email: '' } // Initialize with empty user object
    });
});

// Register form validation middleware
const validateRegister = [
    check('username')
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
        .trim()
        .escape(),
    check('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    check('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match')
];

// Register form submission
router.post('/register', validateRegister, async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const usernameLower = username.toLowerCase().trim();
        
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('auth/register', {
                title: 'Register | FindMyCamp',
                error: errors.array()[0].msg,
                user: { 
                    username: usernameLower || ''
                },
                page: 'register'
            });
        }

        // Check if username already exists (case insensitive)
        const existingUser = await User.findOne({ 
            username: { $regex: new RegExp(`^${usernameLower}$`, 'i') } 
        });

        if (existingUser) {
            return res.status(400).render('auth/register', {
                title: 'Register | FindMyCamp',
                error: 'A user with that username already exists',
                user: { username: usernameLower },
                page: 'register'
            });
        }

        // Create new user with isActive set to true
        const newUser = new User({ 
            username: usernameLower,
            isActive: true,
            lastLogin: new Date()
        });

        // Register user with passport-local-mongoose
        User.register(newUser, password, async (err, user) => {
            if (err) {
                console.error('Registration error:', err);
                let errorMessage = 'An error occurred during registration. Please try again.';
                
                // Handle specific registration errors
                if (err.name === 'UserExistsError') {
                    errorMessage = 'A user with that username already exists.';
                } else if (err.name === 'MissingUsernameError') {
                    errorMessage = 'Username is required.';
                } else if (err.name === 'MissingPasswordError') {
                    errorMessage = 'Password is required.';
                } else if (err.name === 'MongoServerError' && err.code === 11000) {
                    errorMessage = 'A user with that username already exists.';
                }
                
                return res.status(400).render('auth/register', {
                    title: 'Register | FindMyCamp',
                    error: errorMessage,
                    user: { username: usernameLower },
                    page: 'register'
                });
            }

            // Log the user in after registration
            req.login(user, async (err) => {
                if (err) {
                    console.error('Auto-login after registration failed:', err);
                    req.flash('success', 'Registration successful! Please log in.');
                    return res.redirect('/login');
                }

                try {
                    // Set success message
                    req.flash('success', `Welcome to FindMyCamp, ${user.username}!`);
                    return res.redirect('/campgrounds');
                } catch (error) {
                    console.error('Error after registration:', error);
                    // Even if there's an error after login, the user is still logged in
                    req.flash('success', `Welcome to FindMyCamp, ${user.username}!`);
                    return res.redirect('/campgrounds');
                }
            });
        });
    } catch (error) {
        console.error('Error during registration:', error);
        req.flash('error', 'An unexpected error occurred. Please try again.');
        res.redirect('/register');
    }
});

// Logout route
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { 
            console.error('Logout error:', err);
            return next(err); 
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return next(err);
            }
            res.clearCookie('findMyCamp.sid');
            req.flash('success', 'Successfully logged out. Come back soon!');
            res.redirect('/campgrounds');
        });
    });
});

module.exports = router;