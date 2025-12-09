const express = require('express');
const app = express();
const path = require('path');
const env = require('dotenv').config();
const session = require('express-session');
const passport = require('./config/passport');
const db = require('./config/db');
const userSession = require("./middlewares/userSession");   // ✅ ADD THIS
const adminRoute = require('./routes/adminRoute.js');
const userRouter = require('./routes/userRouter.js');
const flash = require('connect-flash');

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

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));

// ⭐️ Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ⭐️ ADD THIS BEFORE ROUTES
app.use(userSession);   // ⬅ res.locals.user always available in navbar

// ROUTES
app.use('/', userRouter);
app.use('/admin', adminRoute);

const PORT = process.env.PORT || 7777;
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});

module.exports = app;