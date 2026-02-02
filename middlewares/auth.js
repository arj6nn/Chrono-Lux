import User from "../models/user.model.js";

// USER AUTH
const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user.id);

    if (!user || user.isBlocked) {
      return req.session.destroy(() => {
        return res.redirect("/login");
      });
    }

    req.user = user;

    res.locals.user = user;

    next();
  } catch (error) {
    console.error("User auth error:", error);
    res.redirect("/login");
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

export {
  userAuth,
  preventUserAuth,
  adminAuth,
  preventAdminAuth
};
