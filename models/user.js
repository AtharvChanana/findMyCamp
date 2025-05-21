const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    savedCampgrounds: [{
        type: Schema.Types.ObjectId,
        ref: 'Campground'
    }]
}, {
    timestamps: true
});

userSchema.plugin(passportLocalMongoose, {
    usernameField: 'username',
    passwordField: 'password'
});

module.exports = mongoose.model('User', userSchema);
