const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');

// Login page
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/campgrounds');
    }
    res.render('auth/login', { 
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Login form submission
router.post('/login', passport.authenticate('local', {
    successRedirect: '/campgrounds',
    failureRedirect: '/login',
    failureFlash: true
}));

// Register page
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/campgrounds');
    }
    res.render('auth/register', { 
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Register form submission
router.post('/register', async (req, res) => {
    try {
        const { username, password, confirmPassword } = req.body;
        
        // Check if password and confirm password match
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/register');
        }

        // Check if username is already taken
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            req.flash('error', 'Username already exists');
            return res.redirect('/register');
        }

        const user = new User({ username });
        const registeredUser = await User.register(user, password);
        
        req.login(registeredUser, err => {
            if (err) {
                req.flash('error', 'Error logging in after registration');
                return res.redirect('/login');
            }
            req.flash('success', 'Welcome to findMyCamp!');
            res.redirect('/campgrounds');
        });
    } catch (err) {
        req.flash('error', 'Error creating account: ' + err.message);
        res.redirect('/register');
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
