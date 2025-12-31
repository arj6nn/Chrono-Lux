
const User = require("../models/user.model");

module.exports = async (req, res, next) => {
    try {
        let userId = req.session.user?._id || req.session.user;

        if (!userId) {
            res.locals.user = null;
            return next();
        }

        const userData = await User.findById(userId).lean();

        if (!userData || userData.isBlocked) {
            req.session.user = null;
            res.locals.user = null;

            if (userData?.isBlocked) {
                req.flash("error", "Your account has been blocked");
            }

            return res.redirect("/login");
        }

        res.locals.user = userData;
        next();

    } catch (err) {
        console.log(err);
        res.locals.user = null;
        next();
    }
};
