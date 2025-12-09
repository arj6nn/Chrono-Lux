const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/user/userController.js');
const profileController = require("../controllers/user/profileController.js")

const checkBlocked = require("../middlewares/checkBlocked.js")
const userSession = require("../middlewares/userSession.js")

router.get('/pageNotFound', userController.pageNotFound);

// Signup
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);

// Login
router.get('/login', userController.loadLogin);
router.post("/login",userController.login)

//Logout
router.get("/logout", userController.logout);

// OTP
router.post("/verify-otp", userController.verifyOtp);
router.get('/resend-otp', userController.resendOtp);

// GOOGLE AUTH
router.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Save session
        // req.session.user = { _id: req.user._id };
        req.session.user = req.user._id;

        // Redirect to home page
        res.redirect('/home');
    }
);

//------------------------
//APPLY BLOCKED CHECK HERE 
//------------------------
router.use(checkBlocked)

// Protected Pages (auto logout if blocked)
router.get('/', userController.loadLandingPage);
router.get('/home', userController.loadHomePage);

//Profile Management
router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid", profileController.forgotEmailValid);

// Forgot Password OTP Verify
router.post("/verify-forgot-otp", profileController.verifyForgotOtp);

// Load Reset Password Page
router.get("/reset-password", profileController.getResetPasswordPage);

// Submit New Password
router.post("/reset-password", profileController.updatePassword);

module.exports = router;
