import adminAuthService from "../../services/admin/auth.service.js";

// PAGE ERROR
const pageerror = async (req, res) => {
    res.render("admins/pageerror");
};


const loadLogin = async (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    res.render("admins/admin-login", { message: null });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await adminAuthService.authenticateAdmin(email, password);

        if (!admin) {
            return res.redirect("/admin/login");
        }

        req.session.admin = { id: admin._id };
        res.redirect("/admin/dashboard");

    } catch (error) {
        console.error("Admin login error:", error);
        res.redirect("/pageerror");
    }
};

const logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("admin_sid");
        res.redirect("/admin/login");
    });
};

export default {
    pageerror,
    loadLogin,
    login,
    logout
};
