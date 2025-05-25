const mongoose = require('mongoose');
const Campground = require('../models/campground');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
    console.log('Connected to MongoDB');
    
    try {
        // Find all campgrounds
        const campgrounds = await Campground.find({});
        let updatedCount = 0;
        let errorCount = 0;
        
        console.log(`Found ${campgrounds.length} campgrounds to check`);
        
        // Update each campground with default values if fields are missing
        for (const campground of campgrounds) {
            try {
                let needsUpdate = false;
                
                // Set default values for required fields if they're missing
                if (!campground.image) {
                    campground.image = 'https://source.unsplash.com/random/800x600/?camping';
                    needsUpdate = true;
                }
                
                if (!campground.description) {
                    campground.description = 'A beautiful campground with amazing views and great amenities.';
                    needsUpdate = true;
                }
                
                if (!campground.location) {
                    campground.location = 'National Park, CA';
                    needsUpdate = true;
                }
                
                // Set random values for the new fields if they're missing
                if (typeof campground.rating === 'undefined') {
                    campground.rating = parseFloat((Math.random() * 4 + 1).toFixed(1)); // 1.0 to 5.0
                    needsUpdate = true;
                }
                
                if (typeof campground.reviewCount === 'undefined') {
                    campground.reviewCount = Math.floor(Math.random() * 1000);
                    needsUpdate = true;
                }
                
                if (typeof campground.price === 'undefined') {
                    campground.price = parseFloat((Math.random() * 490 + 10).toFixed(2)); // $10 to $500
                    needsUpdate = true;
                }
                
                if (needsUpdate) {
                    await campground.save();
                    console.log(`Updated campground: ${campground.title}`);
                    updatedCount++;
                }
            } catch (err) {
                console.error(`Error updating campground ${campground._id}:`, err.message);
                errorCount++;
            }
        }
        
        console.log(`\nMigration complete!`);
        console.log(`Total campgrounds checked: ${campgrounds.length}`);
        console.log(`Successfully updated: ${updatedCount}`);
        console.log(`Errors: ${errorCount}`);
        
        process.exit(0);
    } catch (err) {
        console.error('Error in migration:', err);
        process.exit(1);
    }
});
