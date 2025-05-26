const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Function to generate a random number between min and max (inclusive)
const getRandomNumber = (min, max) => {
    return (Math.random() * (max - min + 1) + min).toFixed(2);
};

const campgroundSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    reviewCount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    savedBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
})

// Add a pre-save hook to generate random price and rating if not provided
campgroundSchema.pre('save', function(next) {
    if (this.isNew) {
        if (!this.price) {
            this.price = parseFloat(getRandomNumber(10, 500));
        }
        if (!this.rating) {
            this.rating = parseFloat((Math.random() * 4 + 1).toFixed(1)); // Rating between 1.0 and 5.0
        }
        if (!this.reviewCount) {
            this.reviewCount = Math.floor(Math.random() * 1000); // Up to 1000 reviews
        }
    }
    next();
});

module.exports = mongoose.model('Campground',campgroundSchema)