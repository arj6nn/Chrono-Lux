// const User = require("../models/userSchema");

// module.exports = async (req, res, next) => {
//     try {
//         // If admin is logged in → DO NOTHING to user session
//         if (req.session.admin) {
//             res.locals.user = null;
//             return next();
//         }

//         let userId = req.session.user;

//         // If not logged in as user
//         if (!userId) {
//             res.locals.user = null;
//             return next();
//         }

//         const userData = await User.findById(userId).lean();

//         // If no user OR blocked user
//         if (!userData || userData.isBlocked) {

//             // Clear user session
//             req.session.user = null;

//             // Clear user local
//             res.locals.user = null;

//             // Redirect ONLY if user is blocked
//             if (userData && userData.isBlocked) {
//                 req.flash("error", "Your account has been blocked");
//             }

//             return res.redirect("/login");
//         }

//         // Normal user
//         res.locals.user = userData;
//         next();

//     } catch (err) {
//         console.log(err);
//         res.locals.user = null;
//         next();
//     }
// };

const User = require("../models/userSchema");

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
