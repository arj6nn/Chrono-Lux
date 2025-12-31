const mongoose = require('mongoose');

const User = require("../../models/user.model");
const Product = require("../../models/product.model")
const Brand = require("../../models/brand.model")
const Category = require("../../models/category.model")
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

// 404 PAGE
const pageNotFound = async (req, res) => {
  try {
    res.render("users/page-404");
  } catch (error) {
    res.redirect("users/page-404");
  }
};

// LANDING PAGE
const loadLandingPage = async (req, res) => {
  try {

    const featuredProducts = await Product.find({
      isBlocked: false
    })
      .sort({ createdAt: -1 })   // latest added
      .limit(4)
      .populate("brand", "brandName")
      .lean();

    const categories = await Category.find({
      isListed: true,
      isBlocked: false
    })
      .select("name description categoryImage categoryOffer")
      .sort({ createdAt: -1 })
      .limit(3) // same count as your static UI
      .lean();

    return res.render("users/landing", {
      featuredProducts,
      categories
    });

  } catch (error) {
    console.error("Landing page error:", error);
    res.status(500).send("Server error");
  }
};

// HOME PAGE
const loadHomePage = async (req, res) => {
  try {
    // Login success popup flag
    const success = req.session.loginSuccess;
    req.session.loginSuccess = null;

    const featuredProducts = await Product.find({
      isBlocked: false
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate("brand", "brandName")
      .lean();

    const categories = await Category.find({
      isListed: true,
      isBlocked: false
    })
      .select("name description categoryImage categoryOffer")
      .sort({ createdAt: -1 })
      .limit(3) // same count as your static UI
      .lean();

    return res.render("users/home", {
      success,
      featuredProducts,
      categories
    });

  } catch (error) {
    console.error("Home page error:", error);
    res.status(500).send("Server error");
  }
};

// SIGNUP PAGE
const loadSignup = async (req, res) => {
  try {
    return res.render("users/signup", { message: null });
  } catch (error) {
    res.status(500).send("Server error");
  }
};

// LOGIN PAGE
const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("users/login", { message: null, blocked: false });
    } else {
      return res.redirect("/home");
    }
  } catch (error) {
    res.redirect("/users/page-404");
  }
};

// OTP GENERATOR
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SEND MAIL FUNCTION
async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}


// SIGNUP (SEND OTP)
const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cPassword } = req.body;

    if (password !== cPassword) {
      return res.render("users/signup", { message: "Passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("users/signup", { message: "User already exists with this email" });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.json("email-error");
    }

    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };

    console.log("OTP sent:", otp);

    return res.render("users/verify-otp");
  } catch (error) {
    console.error("Signup error", error);
    res.redirect("/users/page-404");
  }
};

// HASH PASSWORD
const securePassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch {
    throw new Error("Password hashing failed");
  }
};

// VERIFY OTP
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.userOtp) {
      return res.json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    if (otp !== req.session.userOtp.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again",
      });
    }

    const user = req.session.userData;
    const passwordHash = await securePassword(user.password);

    const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: passwordHash,
    });

    await saveUserData.save();

    delete req.session.userOtp;
    delete req.session.userData;

    req.session.user = saveUserData._id;

    return res.json({
      success: true,
      redirectUrl: "/home",
    });
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while verifying OTP",
    });
  }
};

// RESEND OTP
const resendOtp = async (req, res) => {
  try {
    if (!req.session.userData || !req.session.userData.email) {
      return res.json({
        success: false,
        message: "Session expired. Please signup again.",
      });
    }

    const newOtp = generateOtp();
    req.session.userOtp = newOtp;

    const emailSent = await sendVerificationEmail(req.session.userData.email, newOtp);

    if (!emailSent) {
      return res.json({
        success: false,
        message: "Failed to resend OTP. Try again.",
      });
    }

    console.log("New OTP Sent:", newOtp);

    return res.json({
      success: true,
      message: "New OTP sent successfully!",
    });
  } catch (error) {
    console.log("Resend OTP error:", error);
    return res.json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await User.findOne({ isAdmin: 0, email });

    if (!findUser) {
      return res.render("users/login", { message: "User not found", blocked: false });
    }

    if (findUser.isBlocked) {
      return res.render("users/login", { blocked: true, message: null });
    }

    if (!findUser.password) {
      return res.render("users/login", {
        message: "Account error: missing password. Please reset password.",
        blocked: false
      });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("users/login", { message: "Incorrect password", blocked: false });
    }

    req.session.user = findUser._id;

    req.session.loginSuccess = true;

    return res.redirect("/home");

  } catch (error) {
    console.error("Login error", error);
    return res.render("users/login", {
      message: "Login failed, Please try again later",
      blocked: false
    });
  }
};

// LOGOUT (fixed)
const logout = (req, res) => {
  try {
    // remove ONLY user session
    delete req.session.user;
    return res.redirect("/login");
  } catch (error) {
    console.log("logout Error", error);
    res.redirect("/home");
  }
};

const loadShopPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const { category, brand, maxPrice, search } = req.query;

    // LOAD SIDEBAR DATA
    const categories = await Category.find({
      isListed: true,
      isBlocked: false
    }).select("_id name");

    const brands = await Brand.find({
      isBlocked: false
    }).select("_id brandName");

    const activeCategoryIds = categories.map(c => c._id);

    // BASE FILTER (shared)
    let baseFilter = {
      isBlocked: false,
      category: { $in: activeCategoryIds }
    };

    // SEARCH FILTER
    if (search && search.trim() !== "") {
      baseFilter.productName = {
        $regex: search.trim(),
        $options: "i" // case-insensitive
      };
    }


    if (category) {
      const categoryIds = category
        .split(",")
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (categoryIds.length) {
        baseFilter.category = { $in: categoryIds };
      }
    }

    if (brand && mongoose.Types.ObjectId.isValid(brand)) {
      baseFilter.brand = new mongoose.Types.ObjectId(brand);
    }

    let products = [];
    let totalProducts = 0;


    const MAX_PRICE = 1000000;

    const usePriceFilter =
      maxPrice &&
      !isNaN(maxPrice) &&
      Number(maxPrice) < MAX_PRICE;

    if (usePriceFilter) {
      const price = Number(maxPrice);

      const pipeline = [
        { $match: baseFilter },

        // Compute effective price per product
        {
          $addFields: {
            effectivePrice: {
              $min: {
                $map: {
                  input: "$variants",
                  as: "v",
                  in: {
                    $cond: [
                      { $gt: ["$$v.salesPrice", 0] },
                      "$$v.salesPrice",
                      "$$v.price"
                    ]
                  }
                }
              }
            }
          }
        },

        // Apply price filter
        {
          $match: {
            effectivePrice: { $lte: price }
          }
        }
      ];

      // Count
      const countResult = await Product.aggregate([
        ...pipeline,
        { $count: "count" }
      ]);

      totalProducts = countResult[0]?.count || 0;

      // Fetch paginated products
      products = await Product.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit }
      ]);

      // Populate refs after aggregation
      products = await Product.populate(products, [
        { path: "brand", select: "brandName" },
        { path: "category", select: "name" }
      ]);

    }
    //  CASE 2: NO PRICE FILTER => NORMAL FIND
    else {
      totalProducts = await Product.countDocuments(baseFilter);

      products = await Product.find(baseFilter)
        .populate("brand", "brandName")
        .populate("category", "name")
        .skip(skip)
        .limit(limit)
        .lean();
    }

    // FORMAT PRODUCTS
    const formattedProducts = products.map(p => {
      const v = p.variants?.[0] || {};
      return {
        id: p._id,
        productName: p.productName,
        category: p.category?.name,
        brand: p.brand?.brandName,
        price: v.price,
        salesPrice: v.salesPrice,
        image: v.images?.[0]
      };
    });


    const responseData = {
      categories,
      brands,
      products: formattedProducts,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      filters: req.query
    };

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({
        products: responseData.products,
        currentPage: responseData.currentPage,
        totalPages: responseData.totalPages
      });
    }

    // Normal page load → EJS
    res.render("users/shop-page", responseData);


  } catch (err) {
    console.error("Shop load error FULL:", err);
    res.status(500).send("Something went wrong loading shop");
  }
};

const liveSearch = async (req, res) => {
  try {
    const q = req.query.q?.trim();

    if (!q || q.length < 1) {
      return res.json([]);
    }

    const products = await Product.find({
      isBlocked: false,
      productName: { $regex: q, $options: "i" }
    })
      .limit(6) // keep it fast
      .select("productName variants")
      .lean();

    const formatted = products.map(p => {
      const v = p.variants[0] || {};
      return {
        id: p._id,
        productName: p.productName,
        price: v.price,
        salesPrice: v.salesPrice,
        image: v.images?.[0]
      };
    });

    res.json(formatted);

  } catch (err) {
    console.error("Live search error:", err);
    res.status(500).json([]);
  }
};



const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    // MAIN PRODUCT
    const product = await Product.findOne({
      _id: productId,
      isBlocked: false
    })
      .populate({
        path: "category",
        match: { isListed: true, isBlocked: false },
        select: "name"
      })
      .populate({
        path: "brand",
        select: "brandName isBlocked"
      });

    if (!product || !product.category || product.brand.isBlocked) {
      return res.status(404).render("users/page-404");
    }

    // BRAND PRODUCTS FIRST
    let relatedProducts = await Product.find({
      isBlocked: false,
      brand: product.brand._id,
      _id: { $ne: productId }
    })
      .limit(4)
      .lean();

    //RANDOM FILL IF LESS THAN 4
    if (relatedProducts.length < 4) {
      const remaining = 4 - relatedProducts.length;

      const excludeIds = relatedProducts.map(p => p._id);
      excludeIds.push(product._id);

      const randomProducts = await Product.aggregate([
        {
          $match: {
            isBlocked: false,
            _id: { $nin: excludeIds }
          }
        },
        { $sample: { size: remaining } }
      ]);

      relatedProducts = [...relatedProducts, ...randomProducts];
    }

    // populate brand & category for aggregation results
    relatedProducts = await Product.populate(relatedProducts, [
      { path: "brand", select: "brandName" },
      { path: "category", select: "name" }
    ]);

    res.render("users/product-details", {
      product,
      relatedProducts
    });

  } catch (err) {
    console.error("Product details load error:", err);
    res.status(500).render("users/500");
  }
};

const googleAuth = async (req, res) => {
  // Save session
  req.session.user = req.user.id;

  // Redirect to home page
  res.redirect('/home');
}


module.exports = {
  loadLandingPage,
  loadHomePage,
  pageNotFound,
  loadSignup,
  loadLogin,
  signup,
  verifyOtp,
  resendOtp,
  login,
  logout,

  loadShopPage,
  liveSearch,
  loadProductDetails,
  googleAuth
};