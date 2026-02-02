import { prepareCheckoutData } from "../../services/user/checkout.service.js";
import Coupon from "../../models/coupon.model.js";
import * as walletService from "../../services/user/wallet.service.js";


const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const appliedCouponId = req.session.appliedCouponId;

    const data = await prepareCheckoutData(userId, appliedCouponId);

    // Service tells controller to redirect
    if (data.redirect) {
      return res.redirect(data.redirect);
    }

    const walletData = await walletService.getWalletDetails(userId);
    const walletBalance = walletData.balance;

    return res.render("users/checkout", {
      ...data,
      reducedItems: data.reducedItems || [],
      removedItems: data.removedItems || [],
      walletBalance,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("Checkout error:", err);
    return res.redirect("/cart");
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session.user?.id;

    const data = await prepareCheckoutData(userId);
    const payableAmount = data.payableAmount;

    const coupon = await Coupon.findOne({
      couponCode: couponCode.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    if (!coupon) {
      return res.status(400).json({ success: false, message: "Invalid or expired coupon code" });
    }

    if (coupon.minimumPurchaseAmount > payableAmount) {
      return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minimumPurchaseAmount} required` });
    }

    if (coupon.usedBy.includes(userId)) {
      return res.status(400).json({ success: false, message: "You have already used this coupon" });
    }

    if (coupon.totalUsageLimit > 0 && coupon.usedCount >= coupon.totalUsageLimit) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    }

    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = (payableAmount * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }

    req.session.appliedCouponId = coupon._id;

    return res.json({
      success: true,
      message: "Coupon applied successfully",
      discount,
      couponCode: coupon.couponCode
    });

  } catch (err) {
    console.error("Apply coupon error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const removeCoupon = async (req, res) => {
  try {
    delete req.session.appliedCouponId;
    return res.json({ success: true, message: "Coupon removed" });
  } catch (err) {
    console.error("Remove coupon error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export default { loadCheckout, applyCoupon, removeCoupon };