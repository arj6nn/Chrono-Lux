
const authRedirect = (req,res,next) => {

    if (req.session.user) {
        return res.redirect("/home");
    }
    next();

}

module.exports = authRedirect;