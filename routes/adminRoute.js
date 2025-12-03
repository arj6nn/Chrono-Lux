const express = require('express');
const router = express.Router();

// Controllers
const adminController = require('../controllers/admin/adminController');


// Middlewares
const { userAuth, adminAuth } = require("../middlewares/auth");

// Multer for image upload (needed for Cloudinary)
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

// Block / Unblock User
router.patch("/toggle-block/:id", adminAuth, adminController.toggleBlock);

// Delete user
router.delete("/delete-user/:id", adminAuth, adminController.deleteUser);


// ------------------------------
// BRAND MANAGEMENT
// ------------------------------
router.get("/brands", adminAuth, adminController.loadBrandManagement);

router.post("/brands/add", adminAuth, adminController.addBrand);

router.post("/brands/edit/:id", adminAuth, adminController.editBrand);

router.post("/brands/delete/:id", adminAuth, adminController.deleteBrand);


// -------------------------------------------------
// ⭐ PRODUCT MANAGEMENT ROUTES (NEW & COMPLETE)
// -------------------------------------------------

// Load Product Management Page
router.get("/products", adminAuth, adminController.loadProductPage);

// Add product (upload multiple images)
router.post(
    "/products/add",
    adminAuth,
    upload.array("images", 10), // accept up to 10 files
    adminController.addProduct
);

// Edit product (optional images)
router.post(
    "/products/edit/:id",
    adminAuth,
    upload.array("images", 10),
    adminController.editProduct
);

// Soft delete product
router.post(
    "/products/delete/:id",
    adminAuth,
    adminController.deleteProduct
);

// Block / Unblock product
router.patch(
    "/products/toggle-block/:id",
    adminAuth,
    adminController.toggleProductBlock
);

// Fetch single product JSON (used by edit modal)
router.get(
    "/products/json/:id",
    adminAuth,
    adminController.getProductJson
);

//Category-Management
router.get('/categories', adminAuth, adminController.loadCategories);

module.exports = router;
