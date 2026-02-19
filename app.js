import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
import session from 'express-session';
import passport from './config/passport.js';
import db from './config/db.js';
import userSession from "./middlewares/userSession.js";
import adminRoute from './routes/admin.route.js';
import userRouter from './routes/user.route.js';
import cartCount from "./middlewares/cartCount.js";
import wishlistCount from "./middlewares/wishlistCount.js";
import flash from 'connect-flash';
import noCacheMiddleware from "./middlewares/noCache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

db();



const adminSessionConfig = session({
    name: 'admin_sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        path: '/admin'
    }
});

const userSessionConfig = session({
    name: 'user_sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000,
        path: '/'
    }
});

app.use((req, res, next) => {
    if (req.path.startsWith('/admin')) {
        adminSessionConfig(req, res, next);
    } else {
        userSessionConfig(req, res, next);
    }
});

app.use(noCacheMiddleware);

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
app.use(cartCount);
app.use(wishlistCount);

// ROUTES
app.use('/', userRouter);
app.use('/admin', adminRoute);

app.use((req, res) => {
    res.status(404).render("users/page-404");
});

const PORT = process.env.PORT || 7777;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`http://localhost:${PORT}`);
});

export default app;
// touch
