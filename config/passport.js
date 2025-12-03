const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
require('dotenv').config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:7777/auth/google/callback"
        },

        async (accessToken, refreshToken, profile, done) => {
            try {
                // Google sometimes does not provide email (very rare)
                const email = profile.emails && profile.emails.length > 0 
                    ? profile.emails[0].value 
                    : null;

                let user = await User.findOne({ googleId: profile.id });

                // USER EXISTS
                if (user) {
                    return done(null, user);
                }

                // NEW USER
                user = new User({
                    name: profile.displayName || "Google User",
                    email: email,
                    googleId: profile.id,
                    phone: null,
                    password: null
                });

                await user.save();
                return done(null, user);

            } catch (error) {
                return done(error, null);
            }
        }
    )
);

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
});

module.exports = passport;
