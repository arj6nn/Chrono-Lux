const express = require('express');
const router = express.Router();

// Controllers
const adminController = require('../controllers/admin/admin.controller.js');

// Middlewares
const { adminAuth } = require("../middlewares/auth.js");

// Multer for Cloudinary (memory storage)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// PAGE ERROR ROUTE
router.get("/pageerror", adminController.pageerror);

// ADMIN LOGIN + LOGOUT
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/logout", adminController.logout);

// DASHBOARD
router.get("/dashboard", adminAuth, adminController.loadDashboard);

// USER MANAGEMENT
router.get("/users", adminAuth, adminController.loadUsersPage);
router.patch("/toggle-block/:id", adminAuth, adminController.toggleBlock);
router.delete("/delete-user/:id", adminAuth, adminController.deleteUser);

// BRAND MANAGEMENT
router.get("/brands", adminAuth, adminController.loadBrandManagement);

// Add brand
router.post(
  "/brands/add",
  adminAuth,
  upload.single("logo"),
  adminController.addBrand
);

// Edit brand
router.post(
  "/brands/edit/:id",
  adminAuth,
  upload.single("logo"),
  adminController.editBrand
);

// Soft delete (Block / Unblock)
router.patch(
  "/brands/:id/block",
  adminAuth,
  adminController.softDeleteBrand
);

router.patch(
  "/brands/:id/unblock",
  adminAuth,
  adminController.restoreBrand
);

// PRODUCT MANAGEMENT
router.get("/products", adminAuth,adminController.loadProductPage);

//ADD-PRODUCT
router.post(
    "/products/add",
    upload.any(),
    adminController.addProduct
);

//TOGGLE-BUTTON
router.patch(
    "/products/block/:id",
    adminAuth,
    adminController.toggleProductBlock
)

//EDIT PRODUCT
router.get("/products/:productId", adminAuth, adminController.getProductJson)

// EDIT PRODUCT
router.patch(
  "/products/edit/:productId",
  adminAuth,
  upload.any(),
  adminController.editProduct
);

router.delete(
  '/products/delete-variant-image',
  adminAuth,
  adminController.deleteVariantImage
);



// CATEGORY MANAGEMENT
router.get("/categories", adminAuth, adminController.loadCategoryManagement);

router.post(
    "/categories/add",
    adminAuth,
    upload.single("image"),
    adminController.addCategory
);

router.post(
    "/categories/edit/:id",
    adminAuth,
    upload.single("image"),
    adminController.editCategory
);

router.patch(
    "/categories/toggle/:id",
    adminAuth,
    adminController.toggleCategoryStatus
)

module.exports = router;