import Coupon from "../../models/coupon.model.js";

class CouponService {

    async createCoupon(data) {
    const errors = {};

    if (data.totalUsageLimit < 0) {
        errors.usageLimit = "Total usage limit cannot be negative"; 
    }


    if (!data.couponCode || data.couponCode.trim() === "") {
        errors.couponCode = "Coupon code is required";
    }

    if (!data.discountValue || data.discountValue <= 0) {
        errors.discountValue = "Discount value must be greater than 0";
    }

    if (!data.startDate) {
        errors.startDate = "Start date is required";
    }

    if (!data.endDate) {
        errors.endDate = "End date is required";
    }

    if (data.minimumPurchaseAmount < 0) {
        errors.minPurchase = "Minimum purchase amount cannot be negative";
    }


    if (data.startDate && data.endDate) {
        if (new Date(data.endDate) <= new Date(data.startDate)) {
            errors.endDate = "End date must be after start date";
        }
    }

    const exists = await Coupon.findOne({ couponCode: data.couponCode });
    if (exists) {
        errors.couponCode = "Coupon code already exists";
    }

    // 🔴 IMPORTANT: throw field-wise errors
    if (Object.keys(errors).length > 0) {
        throw { errors };
    }

    return await Coupon.create(data);
}


    async getAllCoupons(page = 1, limit = 10, search = "") {
        const skip = (page - 1) * limit;
        const query = search
            ? { couponCode: { $regex: search, $options: "i" } }
            : {};

        const [coupons, totalCoupons] = await Promise.all([
            Coupon.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Coupon.countDocuments(query)
        ]);

        return {
            coupons,
            totalPages: Math.ceil(totalCoupons / limit),
            totalCoupons,
            currentPage: page,
            search
        };
    }

    async getCouponById(id) {
        return await Coupon.findById(id);
    }

async updateCoupon(id, data) {
    const errors = {};

    if (data.totalUsageLimit < 0) {
        errors.usageLimit = "Total usage limit cannot be negative";
    }


    if (!data.couponCode || data.couponCode.trim() === "") {
        errors.couponCode = "Coupon code is required";
    }

    if (!data.discountValue || data.discountValue <= 0) {
        errors.discountValue = "Discount value must be greater than 0";
    }

    if (data.startDate && data.endDate) {
        if (new Date(data.endDate) <= new Date(data.startDate)) {
            errors.endDate = "End date must be after start date";
        }
    }

    if (data.minimumPurchaseAmount < 0) {
        errors.minPurchase = "Minimum purchase amount cannot be negative";
    }


    const exists = await Coupon.findOne({
        couponCode: data.couponCode,
        _id: { $ne: id }
    });

    if (exists) {
        errors.couponCode = "Coupon code already exists";
    }

    if (Object.keys(errors).length > 0) {
        throw { errors };
    }

    return await Coupon.findByIdAndUpdate(id, data, { new: true });
}


    async toggleStatus(id) {
        const coupon = await Coupon.findById(id);
        if (!coupon) throw new Error("Coupon not found");

        coupon.isActive = !coupon.isActive;
        return await coupon.save();
    }
}

export default new CouponService();
