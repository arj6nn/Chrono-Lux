import express from 'express';
const router = express.Router();
import passport from 'passport';

//controllers
import * as page from "../controllers/user/page.controller.js";
import * as auth from "../controllers/user/auth.controller.js";
import * as shop from "../controllers/user/shop.controller.js";
import * as product from "../controllers/user/product.controller.js";
import { googleAuth } from "../controllers/user/googleauth.controller.js";
import userController from "../controllers/user/user.controller.js";
import cartController from "../controllers/user/cart.controller.js";
import checkoutController from "../controllers/user/checkout.controller.js";
import orderController from "../controllers/user/order.controller.js";
import wishlistController from "../controllers/user/wishlist.controller.js";
import * as walletController from "../controllers/user/wallet.controller.js";
import * as razorpayController from "../controllers/user/razorpay.controller.js";

import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

import * as profileController from "../controllers/user/profile.controller.js"

import checkBlocked from "../middlewares/checkBlocked.js"

import { userAuth, preventUserAuth } from "../middlewares/auth.js";
import authRedirect from '../middlewares/authRedirect.js';


router.get('/pageNotFound', page.pageNotFound);
router.get('/', authRedirect, page.loadLandingPage);
router.get('/home', page.loadHomePage);
router.get('/signup', preventUserAuth, page.loadSignup);
router.get('/login', preventUserAuth, page.loadLogin);

// Signup
router.post('/signup', auth.signup);
router.post("/verify-otp", auth.verifyOtp);
router.get('/resend-otp', auth.resendOtp);
router.post("/expire-otp", auth.expireOtp);
router.post("/login", auth.login)
router.get("/logout", auth.logout);

// GOOGLE AUTH
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), googleAuth);

//APPLY BLOCKED CHECK HERE 
router.use(checkBlocked)

//Profile Management
router.get("/forgot-password", profileController.getForgotPassPage)
router.post("/forgot-email-valid", profileController.forgotEmailValid);

// Forgot Password OTP Verify
router.post("/verify-forgot-otp", profileController.verifyForgotOtp);
router.post("/forgot-send-otp", profileController.resendForgotOtp);
router.post("/expire-forgot-otp", profileController.expireForgotOtp);

// Load Reset Password Page
router.get("/reset-password", profileController.getResetPasswordPage);

// Submit New Password
router.post("/reset-password", profileController.updatePassword);

//Shop-page
router.get("/shop", shop.loadShopPage);
router.get("/shop/live-search", shop.liveSearch);

//Product Details Page
router.get("/product/:id", product.loadProductDetails)

//User Profile
router.get("/profile", userAuth, userController.loadProfile);
router.get("/profile/edit", userAuth, userController.loadEditProfile);
router.post("/profile/edit", userAuth, upload.single('profileImage'), userController.updateProfile);
router.post("/profile/upload-image", userAuth, upload.single("profileImage"), userController.uploadProfileImage)
router.get("/profile/refer", userAuth, userController.loadReferPage);

//email reset 
router.post("/profile/email/send-otp", userAuth, profileController.sendEmailChangeOtp);
router.post("/profile/email/verify-otp", userAuth, profileController.verifyEmailChangeOtp);

//password reset
router.post("/change-password", userAuth, userController.changePassword)

//address
router.get("/profile/addresses", userAuth, userController.loadAddressPage);
router.post("/profile/addresses", userAuth, userController.addAddress);
router.patch("/profile/addresses/:id", userAuth, userController.updateAddress);
router.delete("/profile/addresses/:id", userAuth, userController.deleteAddress);

//cart
router.get("/cart", userAuth, cartController.loadCart);
router.post("/cart/add", userAuth, cartController.addToCart);
router.delete("/cart/remove/:itemId", userAuth, cartController.removeFromCart);
router.patch("/cart/update/:itemId", userAuth, cartController.updateQuantity);

//checkout
router.get("/checkout", userAuth, checkoutController.loadCheckout);
router.post("/checkout/apply-coupon", userAuth, checkoutController.applyCoupon);
router.post("/checkout/remove-coupon", userAuth, checkoutController.removeCoupon);
router.get("/checkout/validate-stock", userAuth, checkoutController.validateStock);

//place-order
router.post("/order/place", userAuth, orderController.placeOrder);
router.get("/order/failure", userAuth, orderController.renderOrderFailure);

//order-history
router.get("/profile/orders", userAuth, orderController.loadOrderHistory);
router.get("/profile/orders/:orderId", userAuth, orderController.loadOrderDetails);
router.get("/profile/orders/:orderId/invoice", userAuth, orderController.downloadInvoice);
router.post("/profile/orders/:orderId/return/:itemId", userAuth, orderController.requestReturn);

//order-cancel
router.post("/profile/orders/:orderId/items/:itemId/cancel", userAuth, orderController.cancelSingleItem);
router.post("/profile/orders/:orderId/cancel", userAuth, orderController.cancelWholeOrder);

//wishlist
router.get("/wishlist", userAuth, wishlistController.getWishlist);
router.post("/wishlist/add/:productId", userAuth, wishlistController.addToWishlist);
router.post("/wishlist/remove/:productId", userAuth, wishlistController.removeFromWishlist);

//wallet
router.get("/profile/wallet", userAuth, walletController.loadWalletPage);
router.get("/profile/wallet/addmoney", userAuth, walletController.loadAddMoneyPage);
router.get("/profile/wallet/process-add", userAuth, walletController.addMoney);
router.post("/profile/wallet/verify", userAuth, walletController.verifyWalletPayment);

//razorpay
router.post("/razorpay/create-order", userAuth, razorpayController.createOrder);
router.post("/razorpay/verify-payment", userAuth, razorpayController.verifyPayment);

export default router;