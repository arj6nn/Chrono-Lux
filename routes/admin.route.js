import express, { Router } from 'express';
const router = express.Router();

// controllers
import authController from "../controllers/admin/auth.controller.js";
import dashboardController from "../controllers/admin/dashboard.controller.js";
import * as userController from "../controllers/admin/user.controller.js";
import brandController from "../controllers/admin/brand.controller.js";
import categoryController from "../controllers/admin/category.controller.js";
import * as productController from "../controllers/admin/product.controller.js";
import orderController from "../controllers/admin/order.controller.js";
import * as offerController from "../controllers/admin/offer.controller.js";
import * as couponController from "../controllers/admin/coupon.controller.js";
import salesReportController from "../controllers/admin/sales-report.controller.js";

// Middlewares
import { adminAuth } from "../middlewares/auth.js";

// Multer for Cloudinary (memory storage)
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

//---PAGE ERROR ROUTE---
router.get("/pageerror", authController.pageerror);

//---Auth---
router.get("/login", authController.loadLogin);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

//---DASHBOARD---
router.get("/dashboard", adminAuth, dashboardController.loadDashboard);

//---USER MANAGEMENT---
router.get("/users", adminAuth, userController.loadUsersPage);
router.patch("/toggle-block/:id", adminAuth, userController.toggleBlock);
router.delete("/delete-user/:id", adminAuth, userController.deleteUser);

//---BRAND MANAGEMENT---
router.get("/brands", adminAuth, brandController.loadBrandManagement);

// Add brand
router.post("/brands/add", adminAuth, upload.single("logo"), brandController.addBrand);
// Edit brand
router.post("/brands/edit/:id", adminAuth, upload.single("logo"), brandController.editBrand);
// Soft delete (Block / Unblock)
router.patch("/brands/:id/block", adminAuth, brandController.softDeleteBrand);
router.patch("/brands/:id/unblock", adminAuth, brandController.restoreBrand);


//---PRODUCT MANAGEMENT---
router.get("/products", adminAuth, productController.loadProductPage);

//ADD-PRODUCT
router.post("/products/add", upload.any(), productController.addProduct);

//TOGGLE-BUTTON
router.patch("/products/block/:id", adminAuth, productController.toggleProductBlock)

// SEARCH PRODUCT (for offers)
router.get("/products/search", adminAuth, productController.searchProducts);

// EDIT PRODUCT
router.get("/products/:productId", adminAuth, productController.getProductJson)

// EDIT PRODUCT
router.patch("/products/edit/:productId", adminAuth, upload.any(), productController.editProduct);

router.delete('/products/delete-variant-image', adminAuth, productController.deleteVariantImage);



//---CATEGORY MANAGEMENT---

router.get("/categories", adminAuth, categoryController.loadCategoryManagement);
//add
router.post("/categories/add", adminAuth, upload.single("image"), categoryController.addCategory);
//edit
router.post("/categories/edit/:id", adminAuth, upload.single("image"), categoryController.editCategory);
//soft-delete
router.patch("/categories/toggle/:id", adminAuth, categoryController.toggleCategoryStatus)

//--- ORDER MANAGEMENT ---
router.get("/orders", adminAuth, orderController.getAllOrders);
router.get("/orders/:id", adminAuth, orderController.getOrderDetails);
router.post("/orders/:orderId/items/:itemId/status", adminAuth, orderController.updateItemStatus);

//--- RETURN MANAGEMENT ---
router.get("/returns", adminAuth, orderController.getReturnRequests);
router.post("/returns/:orderId/:itemId/approve", adminAuth, orderController.approveReturn);
router.post("/returns/:orderId/:itemId/reject", adminAuth, orderController.rejectReturn);
router.post("/returns/:orderId/:itemId/refund", adminAuth, orderController.refundReturn);

//--- CANCELLATION MANAGEMENT ---
router.get("/cancellations", adminAuth, orderController.getCancellationRequests);
router.post("/cancellations/:orderId/:itemId/approve", adminAuth, orderController.approveCancellation);
router.post("/cancellations/:orderId/:itemId/reject", adminAuth, orderController.rejectCancellation);

//--- OFFER MANAGEMENT ---
router.get("/offers", adminAuth, offerController.loadOfferPage);
router.post("/offers/add", adminAuth, offerController.createOffer);
router.post("/offers/edit/:id", adminAuth, offerController.updateOffer);
router.patch("/offers/toggle/:id", adminAuth, offerController.toggleOfferStatus);

//--- COUPON MANAGEMENT ---
router.get("/coupons", adminAuth, couponController.renderCouponPage);
router.post("/coupons/add", adminAuth, couponController.createCoupon);
router.get("/coupons/:id", adminAuth, couponController.getCoupon);
router.post("/coupons/edit/:id", adminAuth, couponController.updateCoupon);
router.patch("/coupons/toggle/:id", adminAuth, couponController.toggleCouponStatus);

//--- SALES REPORT ---
router.get("/sales-report", adminAuth, salesReportController.loadSalesReport);
router.get("/sales-report/excel", adminAuth, salesReportController.downloadExcel);
router.get("/sales-report/pdf", adminAuth, salesReportController.downloadPDF);

export default router;