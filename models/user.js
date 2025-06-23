const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot be longer than 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
        lowercase: true
    },
    savedCampgrounds: [{
        type: Schema.Types.ObjectId,
        ref: 'Campground'
    }],
    lastLogin: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    forcePasswordReset: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.password; // Never send password hash to client
            delete ret.salt;
            delete ret.__v;
            return ret;
        }
    },
    toObject: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.salt;
            delete ret.__v;
            return ret;
        }
    }
});

// Plugin configuration with error handling
userSchema.plugin(passportLocalMongoose, {
    usernameField: 'username',
    passwordField: 'password',
    errorMessages: {
        UserExistsError: 'A user with the given username is already registered',
        IncorrectPasswordError: 'Incorrect password',
        IncorrectUsernameError: 'Incorrect username',
        MissingUsernameError: 'No username was given',
        MissingPasswordError: 'No password was given',
        UserExistsError: 'A user with the given username is already registered'
    },
    limitAttempts: true,
    maxAttempts: 5,
    unlockInterval: 300, // 5 minutes in seconds
    usernameLowerCase: true, // Convert username to lowercase
    usernameUnique: true,    // Ensure usernames are unique
    usernameQueryFields: ['username'] // Fields to query when finding user
});

// Add a method to get user profile without sensitive data
userSchema.methods.getProfile = function() {
    return {
        id: this._id,
        username: this.username,
        lastLogin: this.lastLogin,
        isActive: this.isActive,
        createdAt: this.createdAt,
        campgroundsCount: this.savedCampgrounds ? this.savedCampgrounds.length : 0
    };
};

// Add a static method to find by username with case-insensitive search
userSchema.statics.findByUsername = async function(username) {
    if (!username) return null;
    return this.findOne({ username: new RegExp(`^${username}$`, 'i') });
};

// Pre-save hook to handle username formatting and last login updates
userSchema.pre('save', function(next) {
    try {
        // Ensure username is properly formatted
        if (this.isModified('username')) {
            if (!this.username || typeof this.username !== 'string') {
                throw new Error('Username is required and must be a string');
            }
            
            // Trim and convert to lowercase
            this.username = this.username.trim().toLowerCase();
            
            // Validate username format
            const usernameRegex = /^[a-zA-Z0-9_]+$/;
            if (!usernameRegex.test(this.username)) {
                throw new Error('Username can only contain letters, numbers, and underscores');
            }
            
            // Ensure length constraints
            if (this.username.length < 3 || this.username.length > 30) {
                throw new Error('Username must be between 3 and 30 characters');
            }
        }
        
        // Update last login timestamp if this is a login update
        if (this.isModified('lastLogin') && !this.isNew) {
            this.updatedAt = new Date();
        }
        
        next();
    } catch (error) {
        console.error('Error in user pre-save hook:', error);
        next(error);
    }
});

// Error handling middleware for duplicate key errors
userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('A user with this username already exists'));
    } else {
        next(error);
    }
});

// Pre-remove hook to clean up related data when a user is deleted
userSchema.pre('remove', async function(next) {
    try {
        // Remove user's campgrounds
        await mongoose.model('Campground').deleteMany({ author: this._id });
        // Remove user's reviews
        await mongoose.model('Review').deleteMany({ author: this._id });
        next();
    } catch (error) {
        next(error);
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
