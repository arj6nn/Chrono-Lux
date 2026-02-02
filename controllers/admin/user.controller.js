import * as userService from "../../services/admin/user.service.js";

//LOAD USER PAGE
export const loadUsersPage = async (req, res) => {
    try {
        const data = await userService.getUsers(req.query);

        res.render("admins/user-management", {
            activePage: "users",
            users: data.users,
            page: data.page,
            totalPages: data.totalPages,
            search: data.search
        });
    } catch (error) {
        console.log(error);
        res.redirect("/admin/pageerror");
    }
};

//TOGGLE BLOCK
export const toggleBlock = async (req, res) => {
    try {
        const status = await userService.toggleUserBlock(req.params.id);

        res.json({
            success: true,
            status
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

//DELETE USER
export const deleteUser = async (req, res) => {
    try {
        await userService.deleteUserById(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
