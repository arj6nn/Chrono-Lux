import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:7777/auth/google/callback"
        },

        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value || null;
                const profileImage = profile.photos?.[0]?.value || "";

                if (!email) {
                    return done(new Error("Google account has no email"), null);
                }

                // 🔍 STEP 1: Find user by EMAIL
                let user = await User.findOne({ email });

                if (user) {
                    // 🔗 Link Google account if not linked
                    if (!user.googleId) {
                        user.googleId = profile.id;
                    }

                    // 🖼️ Update profile image if missing
                    if (!user.profileImage && profileImage) {
                        user.profileImage = profileImage;
                    }

                    await user.save();
                    return done(null, user);
                }

                // 🆕 STEP 2: Create new Google user
                user = await User.create({
                    name: profile.displayName || "Google User",
                    email,
                    googleId: profile.id,
                    profileImage,
                    password: null,
                    phone: null
                });

                return done(null, user);

            } catch (error) {
                return done(error, null);
            }
        }

    )
);

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
});

export default passport;
