import User from "../../models/user.model.js";
import bcrypt from "bcrypt";

const authenticateAdmin = async (email, password) => {
    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
        return null;
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
        return null;
    }

    return admin;
};

export default {
    authenticateAdmin
};
