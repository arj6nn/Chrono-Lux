
import User from "../models/user.model.js";

export default async (req, res, next) => {
    try {
        let userId =
            typeof req.session.user === "string"
                ? req.session.user
                : req.session.user?.id;


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
