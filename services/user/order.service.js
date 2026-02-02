import Cart from "../../models/cart.model.js";
import Product from "../../models/product.model.js";
import Order from "../../models/order.model.js";
import Address from "../../models/address.model.js";
import calculateOrderStatus from "../../utils/calculateOrderStatus.js";
import { applyOffers } from "../../utils/offerUtils.js";
import Coupon from "../../models/coupon.model.js";
import * as walletService from "./wallet.service.js";

export const placeOrderService = async ({
  userId,
  addressId,
  payment,
  appliedCouponId = null,
  paymentDetails = null,
  paymentStatus = "Pending"
}) => {

  //   1. Validate inputs
  if (!addressId || !payment) {
    throw new Error("INVALID_INPUT");
  }

  //    2. Get cart
  let cart = await Cart.findOne({ userId }).populate({
    path: "items.productId",
    populate: { path: "category" }
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("EMPTY_CART");
  }

  //   3. Apply offers
  const products = cart.items.map(item => item.productId).filter(Boolean);
  const productsWithOffers = await applyOffers(products);

  const productMap = new Map();
  productsWithOffers.forEach(p => productMap.set(p._id.toString(), p));

  //    4. Validate cart items
  const validItems = [];

  for (const item of cart.items) {
    const product = productMap.get(item.productId._id.toString());
    if (!product || product.isBlocked) continue;

    const variant = product.variants.find(
      v => v._id.toString() === item.variantId.toString()
    );

    if (!variant || variant.stock < item.quantity) continue;
    validItems.push(item);
  }

  if (validItems.length !== cart.items.length) {
    const validIds = new Set(validItems.map(v => v._id.toString()));
    cart.items = cart.items.filter(i => validIds.has(i._id.toString()));
    await cart.save();
    throw new Error("CART_UPDATED");
  }

  //   5. Validate address
  const address = await Address.findOne({
    _id: addressId,
    user_id: userId
  });

  if (!address) {
    throw new Error("INVALID_ADDRESS");
  }

  //   6. Validate payment
  if (!["cod", "razorpay", "wallets"].includes(payment)) {
    throw new Error("INVALID_PAYMENT");
  }

  if (payment === "razorpay" && !paymentDetails) {
    throw new Error("INVALID_PAYMENT");
  }

  //   7. Prepare order items
  const orderedItems = cart.items.map(item => {
    const product = productMap.get(item.productId._id.toString());
    const variant = product.variants.find(
      v => v._id.toString() === item.variantId.toString()
    );

    const salePrice =
      variant.salesPrice && variant.salesPrice > 0
        ? variant.salesPrice
        : variant.price;

    return {
      product: product._id,
      variantId: item.variantId,
      quantity: item.quantity,
      price: salePrice,
      mrp: variant.price,
      appliedOffer: variant.appliedOffer
        ? {
          name: variant.appliedOffer.name,
          discountValue: variant.appliedOffer.discountValue,
          offerType: variant.appliedOffer.type
        }
        : null
    };
  });

  //   8. Calculate totals
  const subtotal = orderedItems.reduce(
    (sum, item) => sum + item.mrp * item.quantity,
    0
  );

  const totalAfterOffers = orderedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const offerDiscount = subtotal - totalAfterOffers;
  const deliveryFee = totalAfterOffers >= 5000 ? 0 : 99;

  let couponDiscount = 0;
  let couponCode = "";

  if (appliedCouponId) {
    const coupon = await Coupon.findById(appliedCouponId);
    if (
      coupon &&
      coupon.isActive &&
      new Date() <= coupon.endDate &&
      coupon.minimumPurchaseAmount <= totalAfterOffers
    ) {
      couponDiscount =
        coupon.discountType === "PERCENTAGE"
          ? (totalAfterOffers * coupon.discountValue) / 100
          : Math.min(coupon.discountValue, totalAfterOffers);

      couponCode = coupon.couponCode;
      coupon.usedCount += 1;
      coupon.usedBy.push(userId);
      await coupon.save();
    }
  }

  const finalAmount = totalAfterOffers + deliveryFee - couponDiscount;  

  //     8.5 Verify Wallet Balance (if payment is wallet)
  if (payment === "wallets") {
    const walletData = await walletService.getWalletDetails(userId);
    if (walletData.balance < finalAmount) {
      throw new Error("INSUFFICIENT_WALLET_BALANCE");
    }
  }


  //     9. Create order
  const order = await Order.create({
    userId,
    orderedItems,
    totalPrice: subtotal,
    discount: offerDiscount,
    couponApplied: !!couponCode,
    couponCode,
    couponDiscount,
    finalAmount,
    address: {
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || "",
      city: address.city,
      state: address.state,
      pincode: address.pin_code
    },
    paymentMethod: payment === "razorpay" ? "RAZORPAY" : payment === "wallets" ? "WALLET" : "COD",
    paymentStatus: payment === "wallets" ? "Paid" : paymentStatus, // Wallet is always Paid immediately if successful
    paymentDetails: paymentDetails || null,
    orderStatus: "Pending"
  });

  //     9.5 Debit Wallet (if payment is wallet)
  if (payment === "wallets") {
    await walletService.debitWallet(
      userId,
      finalAmount,
      "order_payment",
      `Payment for Order #${order.orderId}`,
      order._id
    );
  }


  //     10. Reduce stock
  for (const item of orderedItems) {
    await Product.updateOne(
      { _id: item.product, "variants._id": item.variantId },
      { $inc: { "variants.$.stock": -item.quantity } }
    );
  }

  //     11. Clear cart
  await Cart.deleteOne({ userId });

  //     12. Return order
  return Order.findById(order._id).populate("orderedItems.product");
};


export const getOrderHistoryService = async ({ userId, page = 1, limit = 2 }) => {
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  const skip = (page - 1) * limit;

  const totalOrders = await Order.countDocuments({ userId });

  const orders = await Order.find({ userId })
    .populate({
      path: "orderedItems.product",
      select: "productName variants"
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalPages = Math.ceil(totalOrders / limit);

  return {
    orders,
    currentPage: page,
    totalPages
  };
};

export const getOrderDetailsService = async ({ userId, orderId }) => {
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  if (!orderId) {
    throw new Error("INVALID_ORDER_ID");
  }

  const order = await Order.findOne({
    _id: orderId,
    userId
  })
    .populate({
      path: "orderedItems.product",
      select: "productName variants"
    })
    .lean();

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  return order;
};

export const requestReturnService = async ({
  userId,
  orderId,
  itemId,
  reason
}) => {
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  if (!reason) {
    throw new Error("REASON_REQUIRED");
  }

  const order = await Order.findOne({
    _id: orderId,
    userId
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const item = order.orderedItems.id(itemId);

  if (!item) {
    throw new Error("ITEM_NOT_FOUND");
  }

  if (item.status !== "Delivered") {
    throw new Error("ITEM_NOT_DELIVERED");
  }

  if (item.returnStatus === "Requested") {
    throw new Error("RETURN_ALREADY_REQUESTED");
  }

  // Update return details
  item.status = "Returned";
  item.returnStatus = "Requested";
  item.returnReason = reason;
  item.returnRequestedAt = new Date();

  await order.save();

  return true;
};

export const cancelSingleItemService = async ({
  userId,
  orderId,
  itemId,
  reason
}) => {
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  if (!reason || !reason.trim()) {
    throw new Error("REASON_REQUIRED");
  }

  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const item = order.orderedItems.id(itemId);
  if (!item) {
    throw new Error("ITEM_NOT_FOUND");
  }

  const nonCancellableStatuses = [
    "Shipped",
    "Delivered",
    "Cancelled",
    "Returned",
    "Refunded"
  ];

  if (nonCancellableStatuses.includes(item.status)) {
    throw new Error("ITEM_NOT_CANCELLABLE");
  }

  // 1. Check if COD
  if (order.paymentMethod === "COD") {
    // Immediate cancellation
    item.status = "Cancelled";
    item.cancelledAt = new Date();
    item.cancelReason = reason.trim();

    // 2. Restock Product
    if (item.variantId) {
      await Product.updateOne(
        { _id: item.product, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": item.quantity } }
      );
    } else {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      );
    }
  } else {
    // 1. Update item status to Cancellation Requested
    item.status = "Cancellation Requested";
    item.cancelReason = reason.trim();
    item.cancelRequestedAt = new Date();
  }

  // 3. Recalculate order status
  order.orderStatus = calculateOrderStatus(order.orderedItems);

  await order.save();

  return {
    immediate: order.paymentMethod === "COD"
  };
};

export const cancelWholeOrderService = async ({
  userId,
  orderId,
  reason
}) => {
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  if (!reason || !reason.trim()) {
    throw new Error("REASON_REQUIRED");
  }

  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  let cancelledAny = false;

  for (const item of order.orderedItems) {
    const nonCancellableStatuses = [
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returned",
      "Refunded"
    ];

    if (nonCancellableStatuses.includes(item.status)) continue;

    // 1. Handle based on payment method
    if (order.paymentMethod === "COD") {
      item.status = "Cancelled";
      item.cancelledAt = new Date();
      item.cancelReason = reason.trim();

      // Restock inventory
      if (item.variantId) {
        await Product.updateOne(
          { _id: item.product, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": item.quantity } }
        );
      } else {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        );
      }
    } else {
      // Request cancellation
      item.status = "Cancellation Requested";
      item.cancelReason = reason.trim();
      item.cancelRequestedAt = new Date();
    }

    cancelledAny = true;
  }

  if (!cancelledAny) {
    throw new Error("NO_ITEMS_CANCELLABLE");
  }

  // 4. Update order status
  order.orderStatus = calculateOrderStatus(order.orderedItems);

  await order.save();

  return {
    immediate: order.paymentMethod === "COD"
  };
};