const User = require("../models/userSchema")

module.exports = async (req,res,next) => {
    try {
        //If not user logged in -> continue normally
        if(!req.session.user){
            return next();
        }

        //Fetch user data
        const user = await User.findById(req.session.user);

        //If user deleted or not found -> desrtoy session
        if(!user){
            req.session.destroy(() => {});
            return res.redirect("/login");
        }

        //If admin blocked the user -> logout instantly 
        if(user.isBlocked){
            req.session.destroy(() => {});
            return res.redirect("/login?blocked=true")
        }

        next();
    } catch (error) {
        console.log("User block check error:",err);
        next()
    }
}