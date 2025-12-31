const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/user/userController.js');
const profileController = require("../controllers/user/profileController.js")

const checkBlocked = require("../middlewares/checkBlocked.js")
// const userSession = require("../middlewares/userSession.js")

const {  userAuth,  preventUserAuth} = require("../middlewares/auth.js");
const authRedirect = require('../middlewares/authRedirect.js');


router.get('/pageNotFound', userController.pageNotFound);

// Signup
router.get('/signup',preventUserAuth, userController.loadSignup);
router.post('/signup', userController.signup);

// Login
router.get('/login', preventUserAuth,userController.loadLogin);
router.post("/login",userController.login)

//Logout
router.get("/logout", userController.logout);

// OTP
router.post("/verify-otp", userController.verifyOtp);
router.get('/resend-otp', userController.resendOtp);

// GOOGLE AUTH
router.get('/auth/google',passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/login' }),userController.googleAuth);

//APPLY BLOCKED CHECK HERE 
router.use(checkBlocked)

// Protected Pages (auto logout if blocked)
router.get('/',authRedirect,userController.loadLandingPage);

router.get('/home',userController.loadHomePage);

//Profile Management
router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid", profileController.forgotEmailValid);

// Forgot Password OTP Verify
router.post("/verify-forgot-otp", profileController.verifyForgotOtp);

router.post("/forgot-send-otp", profileController.resendForgotOtp);

// Load Reset Password Page
router.get("/reset-password", profileController.getResetPasswordPage);

// Submit New Password
router.post("/reset-password", profileController.updatePassword);

//Shop-page
router.get("/shop", userController.loadShopPage)
router.get("/shop/live-search", userController.liveSearch)

//Product Details Page
router.get("/product/:id",userController.loadProductDetails)


module.exports = router;