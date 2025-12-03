// controllers/admin/adminController.js

const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");

const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

const cloudinary = require("../../config/cloudinary");
const streamifier = require("streamifier");

// PAGE ERROR
const pageerror = async (req, res) => res.render("admins/pageerror");

// -------------------------- AUTH --------------------------
const loadLogin = async (req, res) => {
    if (req.session.admin) return res.redirect("/admin/dashboard");
    res.render("admins/admin-login", { message: null });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin && await bcrypt.compare(password, admin.password)) {
            req.session.admin = admin._id;
            return res.redirect("/admin/dashboard");
        }
        return res.redirect("/admin/login");
    } catch (error) {
        console.log(error);
        res.redirect("/pageerror");
    }
};

const logout = (req, res) => {
    req.session.destroy(() => res.redirect("/admin/login"));
};

// ---------------------- DASHBOARD -------------------------
const loadDashboard = async (req, res) => {
    try {
        res.render("admins/dashboard", { activePage: "dashboard" });
    } catch {
        res.redirect("/admin/pageerror");
    }
};

// --------------------- USER MANAGEMENT ---------------------
const loadUsersPage = async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false }).sort({ createdAt: -1 });
        res.render("admins/user-management", {
            activePage: "users",
            users
        });
    } catch (error) {
        console.log(error);
        res.redirect("/admin/pageerror");
    }
};

const toggleBlock = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user)
            return res.json({ success: false, message: "User not found" });

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({
            success: true,
            status: user.isBlocked ? "blocked" : "active"
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};

const deleteUser = async (req, res) => {
    try {
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.json({ success: false, message: "User not found" });

        res.json({ success: true });
    } catch {
        res.json({ success: false });
    }
};

// --------------------- BRAND MANAGEMENT ---------------------
const loadBrandManagement = async (req, res) => {
    try {
        const brands = await Brand.find();
        res.render("admins/brand-management", {
            activePage: "brands",
            brands
        });
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

const addBrand = async (req, res) => {
    try {
        const { name, logo } = req.body;
        await Brand.create({
            brandName: name.trim(),
            brandImage: [logo.trim()]
        });

        res.redirect("/admin/brands");
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

const editBrand = async (req, res) => {
    try {
        const { name, logo } = req.body;
        await Brand.findByIdAndUpdate(req.params.id, {
            brandName: name,
            brandImage: [logo]
        });

        res.redirect("/admin/brands");
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

const deleteBrand = async (req, res) => {
    try {
        await Brand.findByIdAndDelete(req.params.id);
        res.redirect("/admin/brands");
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

// --------------------- PRODUCT MANAGEMENT ---------------------

function uploadBufferToCloudinary(buffer, folder = "chrono_lux_products") {
    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
            { folder, resource_type: "image" },
            (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(buffer).pipe(upload);
    });
}

const loadProductPage = async (req, res) => {
    try {
        const q = {};
        if (req.query.search)
            q.name = { $regex: req.query.search, $options: "i" };
        if (req.query.category) q.category = req.query.category;
        if (req.query.brand) q.brand = req.query.brand;

        q.isDeleted = { $ne: true };

        const products = await Product.find(q)
            .populate("category")
            .populate("brand")
            .sort({ createdAt: -1 });

        const categories = await Category.find();
        const brands = await Brand.find();

        res.render("admins/product-management", {
            activePage: "products",
            products,
            categories,
            brands,
            query: req.query
        });
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

const getProductJson = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate("category")
            .populate("brand");

        if (!product)
            return res.status(404).json({ success: false });

        res.json(product);
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false });
    }
};

const addProduct = async (req, res) => {
    try {
        const body = req.body;
        const files = req.files;

        if (!files || files.length < 3)
            return res.redirect("/admin/products");

        const urls = [];
        for (const file of files)
            urls.push(await uploadBufferToCloudinary(file.buffer));

        await Product.create({
            name: body.name.trim(),
            description: body.description.trim(),
            images: urls,
            price: Number(body.price),
            offerPrice: body.offerPrice === "" ? undefined : Number(body.offerPrice),
            category: body.category,
            brand: body.brand,
            gender: body.gender,
            type: body.type,
            stock: Number(body.stock)
        });

        res.redirect("/admin/products");
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        const files = req.files;

        const update = {
            name: body.name.trim(),
            description: body.description.trim(),
            price: Number(body.price),
            offerPrice:
                body.offerPrice === "" ? undefined : Number(body.offerPrice),
            category: body.category,
            brand: body.brand,
            gender: body.gender,
            type: body.type,
            stock: Number(body.stock)
        };

        if (files && files.length > 0) {
            if (files.length < 3)
                return res.redirect("/admin/products");

            const urls = [];
            for (const file of files)
                urls.push(await uploadBufferToCloudinary(file.buffer));

            update.images = urls;
        }

        await Product.findByIdAndUpdate(id, update);
        res.redirect("/admin/products");
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

const deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.redirect("/admin/products");
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

const toggleProductBlock = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product)
            return res.json({ success: false });

        product.isBlocked = !product.isBlocked;
        await product.save();

        res.json({ success: true });
    } catch {
        res.json({ success: false });
    }
};

const loadCategories = async (req,res) => {
    try {
        const categories = await Category.find({})
        res.render("admins/category-management", { categories, activePage : 'categories' })
    } catch (error) {
        console.log(error)
        res.status(500).send("Error loading categories");
    }
}

// EXPORT
module.exports = {
    loadLogin,
    login,
    logout,
    loadDashboard,
    loadUsersPage,
    toggleBlock,
    deleteUser,
    loadBrandManagement,
    addBrand,
    editBrand,
    deleteBrand,

    loadProductPage,
    addProduct,
    editProduct,
    deleteProduct,
    toggleProductBlock,
    getProductJson,
    pageerror,
    loadCategories
};
