const User = require("../models/user.model");

// USER AUTH
const userAuth = async (req, res, next) => {
    try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    // fetch user from DB
    const user = await User.findById(req.session.user.id);

    // user not found or blocked
    if (!user || user.isBlocked) {
      return req.session.destroy(() => {
        res.redirect("/login");
      });
    }  

    next();
  } catch (error) {
    res.status(500).send("Internal server error");
  }
};

const preventUserAuth = (req, res, next) => {
  if (req.session.user) {
    return res.redirect("/home");
  }
  next();
};


// ADMIN AUTH
const adminAuth = async (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    // fetch admin from DB
    const admin = await User.findById(req.session.admin.id);

    if (!admin || !admin.isAdmin) {
      return req.session.destroy(() => {
        res.redirect("/admin/login");
      });
    }

    next();
  } catch (error) {
    console.log("Error in adminAuth middleware:", error);
    res.status(500).send("Internal server error");
  }
};


const preventAdminAuth = (req, res, next) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  next();
};

module.exports = {
    userAuth,
    preventUserAuth,
    adminAuth,
    preventAdminAuth
};
