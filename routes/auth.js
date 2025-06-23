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
    const usernameLower = username.toLowerCase();
    const errors = validationResult(req);
    
    // Handle validation errors
    if (!errors.isEmpty()) {
        return renderLoginError(res, errors.array()[0].msg, username);
    }
    
    // Use passport's local strategy for authentication
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Authentication error:', err);
            return renderLoginError(res, 'An error occurred during authentication. Please try again.', username);
        }
        
        if (!user) {
            return renderLoginError(res, info.message || 'Invalid username or password', username);
        }
        
        // Check if account is active
        if (!user.isActive) {
            return renderLoginError(res, 'This account has been deactivated. Please contact support.', username);
        }
        
        // Log the user in
        req.logIn(user, async (err) => {
            if (err) {
                console.error('Login error:', err);
                return renderLoginError(res, 'An error occurred during login. Please try again.', username);
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
        
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('auth/register', {
                title: 'Register | FindMyCamp',
                error: errors.array()[0].msg,
                user: { 
                    username: username || '', 
                    email: '' 
                },
                page: 'register'
            });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).render('auth/register', {
                title: 'Register | FindMyCamp',
                error: `A user with that username already exists`,
                user: { username },
                page: 'register'
            });
        }


        // Create new user with isActive set to true
        const newUser = new User({ 
            username: username.trim(),
            isActive: true
        });

        // Register user with passport-local-mongoose
        User.register(newUser, password, async (err, user) => {
            if (err) {
                console.error('Registration error:', err);
                return res.status(500).render('auth/register', {
                    title: 'Register | FindMyCamp',
                    error: 'An error occurred during registration. Please try again.',
                    user: { username },
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
                    // Set last login time
                    user.lastLogin = new Date();
                    await user.save();
                    
                    req.flash('success', `Welcome to FindMyCamp, ${user.username}!`);
                    return res.redirect('/campgrounds');
                } catch (updateError) {
                    console.error('Error updating last login after registration:', updateError);
                    // Even if update fails, continue with login
                    req.flash('success', `Welcome to FindMyCamp, ${user.username}!`);
                    return res.redirect('/campgrounds');
                }
            });
        });
    } catch (err) {
        console.error('Registration process error:', err);
        res.status(500).render('auth/register', {
            title: 'Register | FindMyCamp',
            error: 'An unexpected error occurred. Please try again.',
            user: req.body,
            page: 'register'
        });
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