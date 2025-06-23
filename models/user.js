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
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
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
    },
    failedLoginAttempts: {
        type: Number,
        default: 0,
        min: 0
    },
    lockUntil: {
        type: Date
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
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
    }
});

// Add a pre-save hook to handle errors
userSchema.pre('save', function(next) {
    // Add any pre-save logic here
    next();
});

// Add a method to get user profile
userSchema.methods.getProfile = function() {
    return {
        _id: this._id,
        username: this.username,
        savedCampgrounds: this.savedCampgrounds,
        lastLogin: this.lastLogin
    };
};

// Add a static method to find by username with error handling
userSchema.statics.findByUsername = async function(username) {
    try {
        return await this.findOne({ username });
    } catch (error) {
        console.error('Error finding user by username:', error);
        throw error;
    }
};

// Add a method to update last login time
userSchema.methods.updateLastLogin = async function() {
    try {
        this.lastLogin = new Date();
        return await this.save();
    } catch (error) {
        console.error('Error updating last login:', error);
        throw error;
    }
};

// Add a method to check if user is active
userSchema.methods.checkIfActive = function() {
    return this.isActive;
};

// Add a method to deactivate user
userSchema.methods.deactivate = async function() {
    try {
        this.isActive = false;
        return await this.save();
    } catch (error) {
        console.error('Error deactivating user:', error);
        throw error;
    }
};

// Add a method to activate user
userSchema.methods.activate = async function() {
    try {
        this.isActive = true;
        return await this.save();
    } catch (error) {
        console.error('Error activating user:', error);
        throw error;
    }
};

// Add methods for handling failed login attempts
userSchema.methods.incrementLoginAttempts = async function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return await this.updateOne({
            $set: { failedLoginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    
    // Otherwise increment
    const updates = { $inc: { failedLoginAttempts: 1 } };
    
    // Lock the account if we've reached max attempts
    if (this.failedLoginAttempts + 1 >= 5) {
        updates.$set = {
            lockUntil: Date.now() + 15 * 60 * 1000 // 15 minutes
        };
    }
    
    return await this.updateOne(updates);
};

// Helper method to check if account is currently locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save hook to ensure username is lowercase
userSchema.pre('save', function(next) {
    if (this.isModified('username')) {
        this.username = this.username.toLowerCase();
    }
    next();
});

// Error handling middleware
userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('A user with this username already exists'));
    } else {
        next(error);
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
