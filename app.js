const express = require('express');
const app = express();
const path = require('path');
const env = require('dotenv').config();
const session = require('express-session');
const passport = require('./config/passport');
const db = require('./config/db');
const userSession = require("./middlewares/userSession");
const adminRoute = require('./routes/admin.route.js');
const userRouter = require('./routes/user.route.js');
const flash = require('connect-flash');

db();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});


app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));

//Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(userSession);   //res.locals.user always available in navbar

// ROUTES
app.use('/', userRouter);
app.use('/admin', adminRoute);

app.use((req, res) => {
  res.status(404).render("users/page-404");
});

const PORT = process.env.PORT || 7777;
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});

module.exports = app;