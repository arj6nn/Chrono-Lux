import User from "../../models/user.model.js";

//LOAD USER
export const getUsers = async ({ page = 1, search = "" }) => {
    page = Number(page) || 1;
    search = search.trim();

    const limit = 7;
    const skip = (page - 1) * limit;

    const query = {
        isAdmin: false,
        $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
        ]
    };

    const totalUsers = await User.countDocuments(query);

    const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        users,
        page,
        totalPages: Math.ceil(totalUsers / limit),
        search
    };
};

//TOOGLE BLOCK
export const toggleUserBlock = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.isBlocked = !user.isBlocked;
    await user.save();

    return user.isBlocked ? "blocked" : "active";
};

//DELETE USER
export const deleteUserById = async (userId) => {
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) throw new Error("User not found");
};
