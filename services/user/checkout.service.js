
import Cart from "../../models/cart.model.js";
import Address from "../../models/address.model.js";
import Product from "../../models/product.model.js";
import sanitizeCart from "../../utils/sanitizeCart.js";
import { applyOffers } from "../../utils/offerUtils.js";
import Coupon from "../../models/coupon.model.js";

export const prepareCheckoutData = async (userId, appliedCouponId = null) => {
  if (!userId) {
    return { redirect: "/cart" };
  }

  let cart = await Cart.findOne({ userId }).populate({
    path: "items.productId",
    populate: { path: "category" } // Need category for applyOffers
  });

  if (!cart || cart.items.length === 0) {
    return { redirect: "/cart" };
  }

  const { cart: sanitizedCart, reducedItems, removedItems } = await sanitizeCart(cart, Product);
  cart = sanitizedCart;


  if (!cart.items || cart.items.length === 0) {
    return { redirect: "/cart" };
  }

  // Extract products and apply offers
  const products = cart.items.map(item => item.productId).filter(Boolean);
  const productsWithOffers = await applyOffers(products);

  // Map updated products back for price calculation
  const productMap = new Map();
  productsWithOffers.forEach(p => productMap.set(p._id.toString(), p));

  let subtotal = 0;
  let payableAmount = 0;
  let totalDiscount = 0;

  const checkoutItems = cart.items.map(item => {
    const product = productMap.get(item.productId._id.toString());
    const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());

    const mrp = variant.price;
    const salePrice =
      variant.salesPrice && variant.salesPrice > 0
        ? variant.salesPrice
        : variant.price;

    const mrpTotal = mrp * item.quantity;
    const saleTotal = salePrice * item.quantity;

    subtotal += mrpTotal;
    payableAmount += saleTotal;
    totalDiscount += mrpTotal - saleTotal;

    return {
      productId: product._id,
      variantId: variant._id,
      name: product.productName,
      image: variant.images[0],
      mrp,
      salePrice,
      appliedOffer: variant.appliedOffer, // Pass offer info to UI
      quantity: item.quantity,
      total: saleTotal
    };
  });

  const deliveryFee = payableAmount >= 5000 ? 0 : 99;

  const addresses = await Address.find({ user_id: userId })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  // Handle Coupons
  let couponDiscount = 0;
  let appliedCoupon = null;

  if (appliedCouponId) {
    appliedCoupon = await Coupon.findById(appliedCouponId);
    if (appliedCoupon && appliedCoupon.isActive && new Date() <= appliedCoupon.endDate) {
      if (appliedCoupon.discountType === "PERCENTAGE") {
        couponDiscount = (payableAmount * appliedCoupon.discountValue) / 100;
      } else {
        couponDiscount = appliedCoupon.discountValue;
      }
    } else {
      appliedCoupon = null;
    }
  }

  const availableCoupons = await Coupon.find({
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
    minimumPurchaseAmount: { $lte: payableAmount },
    usedBy: { $ne: userId }
  }).sort({ discountValue: -1 });


  return {
    checkoutItems,
    subtotal,
    totalDiscount,
    payableAmount,
    couponDiscount,
    appliedCoupon,
    availableCoupons,
    deliveryFee,
    finalAmount: payableAmount + deliveryFee - couponDiscount,
    addresses,
    reducedItems,
    removedItems
  };
};

