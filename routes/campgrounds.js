const express = require('express');
const router = express.Router();
const Campground = require('../models/campground');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor } = require('../middleware');

// GET saved campgrounds
router.get('/saved', isLoggedIn, catchAsync(async (req, res) => {
    const user = req.user;
    
    // First populate the saved campgrounds array
    const savedCampgrounds = await Promise.all(
        user.savedCampgrounds.map(async (campgroundId) => {
            try {
                const campground = await Campground.findById(campgroundId)
                    .populate('author');
                return campground;
            } catch (err) {
                console.error(`Error fetching campground ${campgroundId}:`, err);
                return null;
            }
        })
    );
    
    // Filter out any null results
    const validCampgrounds = savedCampgrounds.filter(Boolean);
    
    res.render('campgrounds/saved', {
        campgrounds: validCampgrounds,
        currentUser: req.user
    });
}));

// POST save campground
router.post('/:id/save', isLoggedIn, catchAsync(async (req, res) => {
    try {
        const campgroundId = req.params.id;
        const user = req.user;
        const campground = await Campground.findById(campgroundId);
        
        if (!campground) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(404).json({ success: false, message: 'Campground not found' });
            }
            req.flash('error', 'Campground not found');
            return res.redirect('/campgrounds');
        }

        // Check if user has already saved this campground
        const isSaved = user.savedCampgrounds.includes(campgroundId);
        
        if (!isSaved) {
            // Add to user's saved campgrounds
            user.savedCampgrounds.push(campgroundId);
            // Add user to campground's savedBy list
            campground.savedBy.push(user._id);
            
            await Promise.all([
                user.save(),
                campground.save()
            ]);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, message: 'Campground saved successfully', action: 'saved' });
            }
            
            req.flash('success', 'Campground saved successfully');
        } else {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, message: 'Campground already saved', action: 'already_saved' });
            }
            req.flash('info', 'Campground already saved');
        }
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, message: 'Request processed' });
        }
        
        res.redirect(`/campgrounds/${campgroundId}`);
    } catch (error) {
        console.error('Error saving campground:', error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: 'Error saving campground' });
        }
        req.flash('error', 'Error saving campground');
        res.redirect('back');
    }
}));

// POST unsave campground
router.post('/:id/unsave', isLoggedIn, catchAsync(async (req, res) => {
    const campgroundId = req.params.id;
    const user = req.user;
    const campground = await Campground.findById(campgroundId);
    
    if (!campground) {
        req.flash('error', 'Campground not found');
        return res.redirect('/campgrounds');
    }

    // Check if user has saved this campground
    const isSaved = user.savedCampgrounds.includes(campgroundId);
    
    if (isSaved) {
        // Remove from user's saved campgrounds
        user.savedCampgrounds.pull(campgroundId);
        // Remove user from campground's savedBy list
        campground.savedBy.pull(user._id);
        
        await Promise.all([
            user.save(),
            campground.save()
        ]);
        
        req.flash('success', 'Campground removed from saved list');
    } else {
        req.flash('info', 'Campground not in saved list');
    }
    
    res.redirect('/campgrounds/saved');
}));

// DELETE campground (author or admin)
router.delete('/:id', isLoggedIn, (req, res, next) => {
    if (req.user.isAdmin) return next();
    return isAuthor(req, res, next);
}, catchAsync(async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted campground!');
    res.redirect('/campgrounds');
}));

module.exports = router;
