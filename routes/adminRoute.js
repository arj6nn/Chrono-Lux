const express = require('express');
const router = express.Router();

// Controllers
const adminController = require('../controllers/admin/adminController');

// Middlewares
const { adminAuth } = require("../middlewares/auth");

// Multer for Cloudinary (memory storage)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// ------------------------------
// PAGE ERROR ROUTE
// ------------------------------
router.get("/pageerror", adminController.pageerror);

// ------------------------------
// ADMIN LOGIN + LOGOUT
// ------------------------------
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/logout", adminController.logout);

// ------------------------------
// DASHBOARD
// ------------------------------
router.get("/dashboard", adminAuth, adminController.loadDashboard);

// ------------------------------
// USER MANAGEMENT
// ------------------------------
router.get("/users", adminAuth, adminController.loadUsersPage);
router.patch("/toggle-block/:id", adminAuth, adminController.toggleBlock);
router.delete("/delete-user/:id", adminAuth, adminController.deleteUser);

// ------------------------------
// BRAND MANAGEMENT
// ------------------------------
router.get("/brands", adminAuth, adminController.loadBrandManagement);

// Add brand (UPLOAD TO CLOUDINARY)
router.post(
    "/brands/add",
    adminAuth,
    upload.single("logo"),   // <── THIS uploads from PC → Cloudinary
    adminController.addBrand
);

// Edit brand (UPLOAD TO CLOUDINARY)
router.post(
    "/brands/edit/:id",
    adminAuth,
    upload.single("logo"),
    adminController.editBrand
);

// Delete brand
router.post("/brands/delete/:id", adminAuth, adminController.deleteBrand);

// -------------------------------------------------
// PRODUCT MANAGEMENT
// -------------------------------------------------
router.get("/products", adminAuth, adminController.loadProductPage);

router.post(
    "/products/add",
    adminAuth,
    upload.array("images", 10),
    adminController.addProduct
);

router.post(
    "/products/edit/:id",
    adminAuth,
    upload.array("images", 10),
    adminController.editProduct
);

router.post("/products/delete/:id", adminAuth, adminController.deleteProduct);
router.patch("/products/toggle-block/:id", adminAuth, adminController.toggleProductBlock);
router.get("/products/json/:id", adminAuth, adminController.getProductJson);

// Category Management
router.get('/categories', adminAuth, adminController.loadCategories);

module.exports = router;
