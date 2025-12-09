const User = require("../models/userSchema");

// USER AUTH
const userAuth = (req, res, next) => {

    // only check if user logged in
    if (!req.session.user) {
        return res.redirect("/login");
    }

    User.findById(req.session.user)
        .then(data => {
            if (data && !data.isBlocked) {
                next();
            } else {
                res.redirect("/login");
            }
        })
        .catch(error => {
            console.log("Error in userAuth middleware:", error);
            res.status(500).send("Internal server error");
        });
};


// ADMIN AUTH
const adminAuth = async (req, res, next) => {
    try {
        // only check if admin logged in
        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }

        const admin = await User.findById(req.session.admin);

        // must be admin
        if (!admin || !admin.isAdmin) {
            return res.redirect("/admin/login");
        }

        next();

    } catch (error) {
        console.log("Error in adminAuth middleware:", error);
        res.status(500).send("Internal server error");
    }
};

module.exports = {
    userAuth,
    adminAuth
};
