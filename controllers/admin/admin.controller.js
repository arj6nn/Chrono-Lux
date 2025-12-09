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
        let { page = 1, search = "" } = req.query;

        page = Number(page) || 1;
        search = search.trim();

        const limit = 7;
        const skip = (page - 1) * limit;

        // Build search query
        const query = {
            isAdmin: false,
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        };

        const totalUsers = await User.countDocuments(query);

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render("admins/user-management", {
            activePage: "users",
            users,
            page,
            totalPages: Math.ceil(totalUsers / limit),
            search
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
        const { name } = req.body;

        let imageUrl = null;

        // Upload to Cloudinary using memory buffer
        if (req.file) {
            imageUrl = await uploadBrandToCloudinary(req.file.buffer);
        }

        await Brand.create({
            brandName: name.trim(),
            brandImage: [imageUrl]
        });

        res.redirect("/admin/brands");
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};



const editBrand = async (req, res) => {
    try {
        const { name } = req.body;

        const updates = {
            brandName: name.trim()
        };

        // If new logo uploaded → upload to Cloudinary
        if (req.file) {
            const imageUrl = await uploadBrandToCloudinary(req.file.buffer);
            updates.brandImage = [imageUrl];
        }

        await Brand.findByIdAndUpdate(req.params.id, updates);

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
// Upload brand image to Cloudinary
function uploadBrandToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
            { folder: "chrono_lux_brands", resource_type: "image" },
            (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(buffer).pipe(upload);
    });
}

function uploadCategoryToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
            {
                folder: "chrono_lux_categories",
                resource_type: "image"
            },
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
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || "";

    let match = {};

    if (search.trim() !== "") {
      match.$or = [
        { productName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },

      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand"
        }
      },
      { $unwind: "$brand" },

      {
        $match: {
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { "brand.brandName": { $regex: search, $options: "i" } },
            { "category.name": { $regex: search, $options: "i" } }
          ]
        }
      },

      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);

    const totalProducts = await Product.countDocuments(match);

    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await Category.find();
    const brands = await Brand.find();

    return res.render("admins/product-management", {
      products,
      categories,
      brands,
      page,
      totalPages,
      search,
      admin: req.session.admin,
      activePage: 'products'
    });

  } catch (err) {
    console.log(err);
    res.redirect("/admin/pageerror");
  }
};




const getProductJson = async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId)
            .populate("category")
            .populate("brand");

        if (!product)
            return res.status(404).json({ success: false, message: "Not found" });

        res.json({ success: true, product });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false });
    }
};

const addProduct = async (req, res) => {
    try {
        const { productName, description, category, brand } = req.body;

        console.log("BODY:", req.body);
        console.log("FILES:", req.files);

        // Basic validation
        if (!productName || !description || !category || !brand) {
            return res.status(400).json({
                success: false,
                message: "All basic fields are required",
            });
        }

        // --------------------------
        // 1) NORMALIZE VARIANTS
        // --------------------------
        // From your logs, variants looks like:
        // variants: [ <1 empty item>, { color:'black', ... } ]
        let rawVariants = req.body.variants || [];

        let variants = Array.isArray(rawVariants)
            ? rawVariants
            : Object.values(rawVariants);

        // remove empty holes / nulls
        // variants = variants.filter(v => v && Object.keys(v).length > 0);

        variants = variants.filter(v => v && v.color);

        if (!variants.length) {
            return res.status(400).json({
                success: false,
                message: "At least one variant is required",
            });
        }

        // --------------------------
        // 2) HANDLE FILES (upload.any())
        // --------------------------
        // With upload.any(), req.files is an ARRAY like:
        // [ { fieldname: 'variant_0_images', buffer: <Buffer>, mimetype: 'image/jpeg', ... }, ... ]
        const allFiles = Array.isArray(req.files) ? req.files : [];

        // helper: upload a buffer to Cloudinary
        const uploadBufferToCloudinary = (fileBuffer, mimetype) => {
            return new Promise((resolve, reject) => {
                const dataUri = `data:${mimetype};base64,${fileBuffer.toString("base64")}`;
                cloudinary.uploader.upload(
                    dataUri,
                    { folder: "products" },
                    (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    }
                );
            });
        };

        // --------------------------
        // 3) PROCESS EACH VARIANT + IMAGES
        // --------------------------
        for (let i = 0; i < variants.length; i++) {
            let images = [];

            // field names we appended from frontend: variant_0_images, variant_1_images, ...
            const fieldName = `variant_${i}_images`;

            const uploadedFiles = allFiles.filter(f => f.fieldname === fieldName);

            console.log(`Files for ${fieldName}:`, uploadedFiles);

            if (!uploadedFiles.length) {
                return res.status(400).json({
                    success: false,
                    message: `Each variant must contain at least one image (missing for variant #${i + 1})`,
                });
            }

            // upload all images for this variant
            for (const file of uploadedFiles) {
                const uploadResult = await uploadBufferToCloudinary(file.buffer, file.mimetype);
                images.push(uploadResult.secure_url);
            }

            // assign images + convert numeric fields
            variants[i].images = images;
            variants[i].price = Number(variants[i].price) || 0;
            variants[i].stock = Number(variants[i].stock) || 0;
        }

        // --------------------------
        // 4) CREATE PRODUCT
        // --------------------------
        const product = new Product({
            productName,
            description,
            category,
            brand,
            variants,
        });

        await product.save();

        return res.json({
            success: true,
            product,
        });
    } catch (err) {
        console.log("ADD PRODUCT ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to add product",
        });
    }
};


const editProduct = async (req, res) => {
    // console.log("EDIT BODY:", req.body);
    // console.log("EDIT FILES:", req.files);

    try {
        const { productId } = req.params;
        const body = req.body;

        // variants came as json string from formData
        let variants = body.variants;
        if (typeof variants === "string") {
            try {
                variants = JSON.parse(variants);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid variants data"
                });
            }
        }

        if (!Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Product must contain at least one variant"
            });
        }

        // load existing product
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const update = {
            productName: String(body.productName || "").trim(),
            description: String(body.description || "").trim(),
            category: body.category,
            brand: body.brand,
            variants: []
        };

        // loop over variants sent from frontend
        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            if (!variant) continue;

            const variantIdStr = String(variant.id);          // "0", "1", ...
            const variantDbId = variant._id || null;          // Mongo subdoc _id (optional)

            // find existing variant in DB
            let existingVariantDoc = null;
            if (variantDbId) {
                // by mongo subdocument id
                existingVariantDoc = existingProduct.variants.id(variantDbId);
            }
            if (!existingVariantDoc && !isNaN(Number(variantIdStr))) {
                // fallback by index
                existingVariantDoc = existingProduct.variants[Number(variantIdStr)];
            }

            const existingImages = existingVariantDoc?.images || [];

            const variantObj = {
                color: variant.color,
                dialSize: variant.dialSize,
                price: Number(variant.price) || 0,
                stock: Number(variant.stock) || 0,
                images: [...existingImages]   // start with existing images
            };

            // any NEW files for this variant?
            const filesForVariant = (req.files || []).filter(
                f => f.fieldname === `variant_${variantIdStr}_images`
            );

            if (filesForVariant.length > 0) {
                for (const file of filesForVariant) {
                    const url = await uploadBufferToCloudinary(file.buffer, file.mimetype);
                    variantObj.images.push(url);
                }
            }

            // still no images? => invalid
            if (!variantObj.images.length) {
                return res.status(400).json({
                    success: false,
                    message: `Each variant must contain at least one image (variant #${i + 1})`
                });
            }

            update.variants.push(variantObj);
        }

        if (!update.variants.length) {
            return res.status(400).json({
                success: false,
                message: "Product must contain at least one variant"
            });
        }

        await Product.findByIdAndUpdate(productId, update);

        return res.json({ success: true });

    } catch (error) {
        console.log("EDIT PRODUCT ERROR =>", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to edit product"
        });
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
    } catch (error) {
        console.log("TOGGLE ERROR :", error)
        res.json({ success: false });
    }
};

// --------------------- CATEGORY MANAGEMENT ---------------------

const loadCategoryManagement = async (req, res) => {
    try {
        let { page = 1, search = "" } = req.query;
        page = Number(page);

        const limit = 5;
        const query = {};

        // Normalize search
        search = search.trim();

        // If searching → filter
        if (search.length > 0) {
            query.name = { $regex: new RegExp(`^${search}$`, "i") };
        }

        const totalCategories = await Category.countDocuments(query);

        const categories = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.render("admins/category-management", {
            activePage: "categories",
            categories,
            page,
            totalPages: Math.ceil(totalCategories / limit),
            search, // keep real search value
        });

    } catch (error) {
        console.log(error);
        res.redirect("/admin/pageerror");
    }
};




//ADD CATEGORY
const addCategory = async (req, res) => {
    try {
        const { name, description, categoryOffer } = req.body;

        if (!req.file)
            return res.redirect("/admin/categories");

        // Upload image to cloudinary
        const imageUrl = await uploadCategoryToCloudinary(req.file.buffer);

        await Category.create({
            name: name.trim(),
            description: description.trim(),
            categoryOffer: categoryOffer || 0,
            categoryImage: imageUrl
        });

        res.redirect("/admin/categories");
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};


//EDIT CATEGORY
const editCategory = async (req, res) => {
    try {
        const { name, description, categoryOffer } = req.body;

        const updateData = {
            name: name.trim(),
            description: description.trim(),
            categoryOffer
        };

        if (req.file) {
            const imageUrl = await uploadCategoryToCloudinary(req.file.buffer);
            updateData.categoryImage = imageUrl;
        }

        await Category.findByIdAndUpdate(req.params.id, updateData);

        res.redirect("/admin/categories");
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

// TOGGLE CATEGORY ACTIVE/INACTIVE
const toggleCategoryStatus = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.json({ success: false });
        }

        category.isListed = !category.isListed; // Toggle status
        await category.save();

        res.json({ success: true, status: category.isListed });

    } catch (err) {
        console.log(err);
        res.json({ success: false });
    }
};



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

    loadCategoryManagement,
    addCategory,
    editCategory,
    toggleCategoryStatus
};
