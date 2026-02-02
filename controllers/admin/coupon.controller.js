import couponService from "../../services/admin/coupon.service.js";

export const renderCouponPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const search = req.query.search || "";

        const { coupons, totalPages, totalCoupons, currentPage } =
            await couponService.getAllCoupons(page, limit, search);

        res.render("admins/coupon", {
            coupons,
            totalPages,
            currentPage,
            totalCoupons,
            search,
            activePage: 'coupons'
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

export const createCoupon = async (req, res) => {
    try {
        await couponService.createCoupon(req.body);
        res.status(201).json({ message: "Coupon created successfully" });
    } catch (err) {
        // 🔴 IMPORTANT PART
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }

        res.status(400).json({
            message: err.message || "Failed to create coupon"
        });
    }
};

export const getCoupon = async (req, res) => {
    try {
        const coupon = await couponService.getCouponById(req.params.id);
        res.json(coupon);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

export const updateCoupon = async (req, res) => {
    try {
        await couponService.updateCoupon(req.params.id, req.body);
        res.json({ message: "Coupon updated" });
    } catch (err) {
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }

        res.status(400).json({
            message: err.message || "Failed to update coupon"
        });
    }
};


export const toggleCouponStatus = async (req, res) => {
    try {
        await couponService.toggleStatus(req.params.id);
        res.json({ message: "Status updated" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
