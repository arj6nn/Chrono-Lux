const express = require('express');
const app = express();
const path = require('path');
const env = require('dotenv').config();
const session = require('express-session');
const passport = require('./config/passport');
const db = require('./config/db');
const User = require("./models/userSchema");   // ✅ ADD THIS LINE
const adminRoute = require('./routes/adminRoute.js');
const userRouter = require('./routes/userRouter.js');

db();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ FIXED USER MIDDLEWARE
app.use(async (req, res, next) => {
    try {
        if (req.session.user) {
            const userData = await User.findById(req.session.user).lean();
            res.locals.user = userData;    // full user object available everywhere
        } else {
            res.locals.user = null;
        }
        next();
    } catch (error) {
        console.error("User middleware error:", error);
        res.locals.user = null;
        next();
    }
});

app.use('/', userRouter);
app.use('/admin', adminRoute);

const PORT = process.env.PORT || 7777;
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});

module.exports = app;
