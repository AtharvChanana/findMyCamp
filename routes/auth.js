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
router.post('/login', validateLogin, async (req, res, next) => {
    const { username, password } = req.body;
    const errors = validationResult(req);
    
    // Handle validation errors
    if (!errors.isEmpty()) {
        return renderLoginError(res, errors.array()[0].msg, username);
    }
    
    // Check if the user exists before attempting authentication
    try {
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username.toLowerCase() }
            ]
        });
        
        if (!user) {
            return renderLoginError(res, 'No account found with that username or email', username);
        }
        
        // Check if account is active
        if (!user.isActive) {
            return renderLoginError(res, 'This account has been deactivated. Please contact support.', username);
        }
        
        // Check if account is locked
        if (user.isLocked) {
            const timeLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return renderLoginError(
                res, 
                `Account locked. Please try again in ${timeLeft} minute${timeLeft !== 1 ? 's' : ''}.`, 
                username
            );
        }
        
        // Proceed with authentication
        passport.authenticate('local', async (err, user, info) => {
            try {
                if (err) {
                    console.error('Authentication error:', err);
                    
                    // Handle specific authentication errors
                    if (err.name === 'IncorrectPasswordError' || err.name === 'IncorrectUsernameError') {
                        // Increment failed login attempts
                        if (user && typeof user.incrementLoginAttempts === 'function') {
                            await user.incrementLoginAttempts();
                        }
                        return renderLoginError(res, 'Invalid username or password', username);
                    }
                    return next(err);
                }
                
                if (!user) {
                    return renderLoginError(res, info.message || 'Invalid username or password', username);
                }

                // Log the user in
                req.logIn(user, async (err) => {
                    if (err) {
                        console.error('Login error:', err);
                        return next(err);
                    }

                    try {
                        // Reset failed login attempts on successful login
                        if (user.failedLoginAttempts > 0 || user.lockUntil) {
                            user.failedLoginAttempts = 0;
                            user.lockUntil = undefined;
                            await user.save();
                        }
                        
                        // Update last login time
                        await user.updateLastLogin();
                        
                        // Set success message
                        req.flash('success', `Welcome back, ${user.username}!`);
                        
                        // Check if user needs to reset password
                        if (user.forcePasswordReset) {
                            req.flash('info', 'Please update your password.');
                            return res.redirect('/account/password/change');
                        }
                        
                        // Redirect to the original URL or default
                        const redirectTo = req.session.returnTo || '/campgrounds';
                        delete req.session.returnTo;
                        return res.redirect(redirectTo);
                        
                    } catch (updateError) {
                        console.error('Error during login process:', updateError);
                        // Even if update fails, still log the user in
                        req.flash('success', `Welcome back, ${user.username}!`);
                        return res.redirect('/campgrounds');
                    }
                });
                
            } catch (error) {
                console.error('Login process error:', error);
                return renderLoginError(res, 'An error occurred during login. Please try again.', username);
            }
        })(req, res, next);
        
    } catch (err) {
        console.error('Error during login:', err);
        return renderLoginError(res, 'An error occurred during login. Please try again.', username);
    }
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
        user: null
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
    check('email')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
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
        const { username, email, password } = req.body;
        
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('auth/register', {
                title: 'Register | FindMyCamp',
                error: errors.array()[0].msg,
                user: { username, email },
                page: 'register'
            });
        }

        // Check if username or email already exists
        const existingUser = await User.findOne({ 
            $or: [
                { username },
                { email: email.toLowerCase() }
            ]
        });

        if (existingUser) {
            const field = existingUser.username === username ? 'username' : 'email';
            return res.status(400).render('auth/register', {
                title: 'Register | FindMyCamp',
                error: `A user with that ${field} already exists`,
                user: { username, email },
                page: 'register'
            });
        }

        // Create new user
        const newUser = new User({ 
            username: username.trim(),
            email: email.toLowerCase().trim()
        });

        // Register user with passport-local-mongoose
        User.register(newUser, password, async (err, user) => {
            if (err) {
                console.error('Registration error:', err);
                return res.status(500).render('auth/register', {
                    title: 'Register | FindMyCamp',
                    error: 'An error occurred during registration. Please try again.',
                    user: { username, email },
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
                    // Update last login time
                    await user.updateLastLogin();
                    
                    req.flash('success', `Welcome to FindMyCamp, ${user.username}!`);
                    const redirectTo = req.session.returnTo || '/campgrounds';
                    delete req.session.returnTo;
                    return res.redirect(redirectTo);
                } catch (updateError) {
                    console.error('Error updating last login after registration:', updateError);
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

// Logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            req.flash('error', 'Error logging out');
            return next(err);
        }
        req.flash('success', 'Logged out successfully!');
        res.redirect('/campgrounds');
    });
});

module.exports = router;
