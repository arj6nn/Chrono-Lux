import Order from "../../models/order.model.js";
import User from "../../models/user.model.js";
import Product from "../../models/product.model.js";
import calculateOrderStatus from "../../utils/calculateOrderStatus.js";
import * as walletService from "../user/wallet.service.js";

const validItemTransitions = {
  Pending: ["Processing", "Shipped", "Delivered", "Cancelled"],
  Processing: ["Shipped", "Delivered", "Cancelled"],
  Shipped: ["Delivered", "Returned"],
  Delivered: ["Returned"],
  Cancelled: [],
  Returned: ["Refunded"]
};

/* ================= ORDERS ================= */

const getAllOrders = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [orders, totalOrders] = await Promise.all([
    Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments()
  ]);

  return {
    orders,
    totalPages: Math.ceil(totalOrders / limit),
    totalOrders,
    currentPage: page
  };
};

const getOrderDetails = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate("userId", "name email")
    .populate("orderedItems.product");

  if (!order) throw new Error("ORDER_NOT_FOUND");

  const correctStatus = calculateOrderStatus(order.orderedItems);

  if (order.orderStatus !== correctStatus) {
    order.orderStatus = correctStatus;
    await order.save();
  }

  return order;
};

/* ================= ITEM STATUS ================= */

const updateItemStatus = async ({ orderId, itemId, newStatus }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const item = order.orderedItems.id(itemId);
  if (!item) throw new Error("ITEM_NOT_FOUND");

  if (["Cancelled", "Refunded"].includes(item.status)) return;

  if (!validItemTransitions[item.status]?.includes(newStatus)) return;

  item.status = newStatus;

  order.orderStatus = calculateOrderStatus(order.orderedItems);

  if (order.orderStatus === "Delivered" && order.paymentMethod === "COD") {
    order.paymentStatus = "Paid";
  }

  await order.save();
};

/* ================= RETURNS ================= */

const getReturnRequests = async () => {
  return await Order.find({
    "orderedItems.returnStatus": "Requested"
  })
    .populate("userId", "name email")
    .populate("orderedItems.product");
};

const approveReturn = async ({ orderId, itemId }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const item = order.orderedItems.id(itemId);
  if (!item || item.returnStatus !== "Requested") return;

  item.returnStatus = "Approved";
  await order.save();
};

const rejectReturn = async ({ orderId, itemId, reason }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const item = order.orderedItems.id(itemId);
  if (!item || item.returnStatus !== "Requested") return;

  item.returnStatus = "Rejected";
  item.returnRejectReason = reason || "Return rejected by admin";

  await order.save();
};

/* ================= REFUND ================= */

const refundReturn = async ({ orderId, itemId }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const item = order.orderedItems.id(itemId);
  if (!item || item.returnStatus !== "Approved") return;

  const user = await User.findById(order.userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const itemTotalAfterOffers = item.price * item.quantity;

  const orderItemsTotal = order.orderedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const proportionateCouponDiscount = order.couponDiscount > 0
    ? (itemTotalAfterOffers / orderItemsTotal) * order.couponDiscount
    : 0;

  const refundAmount = Math.round(itemTotalAfterOffers - proportionateCouponDiscount);

  // restore stock
  await Product.updateOne(
    { _id: item.product, "variants._id": item.variantId },
    { $inc: { "variants.$.stock": item.quantity } }
  );

  // credit wallet using standalone model
  await walletService.creditWallet(
    order.userId,
    refundAmount,
    "refund",
    `Refund for returned item in Order #${order.orderId}`,
    order._id
  );

  // update item
  item.status = "Refunded";
  item.returnStatus = "Refunded";
  item.returnedAt = new Date();

  // update order
  order.refundAmount += refundAmount;
  order.orderStatus = calculateOrderStatus(order.orderedItems);

  if (order.refundAmount >= order.finalAmount) {
    order.paymentStatus = "Refunded";
  }

  await order.save();
};

/* ================= CANCELLATIONS ================= */

const getCancellationRequests = async () => {
  return await Order.find({
    "orderedItems.status": "Cancellation Requested"
  })
    .populate("userId", "name email")
    .populate("orderedItems.product")
    .lean();
};

const approveCancellation = async ({ orderId, itemId }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const item = order.orderedItems.id(itemId);
  if (!item || item.status !== "Cancellation Requested") return;

  // 1. Restore Stock
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

  // 2. Handle Refund
  if (order.paymentMethod !== "COD" && order.paymentStatus === "Paid") {
    // Calculate accurate refund: (item.price * item.quantity) - proportionate coupon discount
    const itemTotalAfterOffers = item.price * item.quantity;

    // Sum of all items' (price * quantity) to calculate proportionate coupon discount
    const orderItemsTotal = order.orderedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const proportionateCouponDiscount = order.couponDiscount > 0
      ? (itemTotalAfterOffers / orderItemsTotal) * order.couponDiscount
      : 0;

    const refundAmount = Math.round(itemTotalAfterOffers - proportionateCouponDiscount);

    // Credit wallet
    await walletService.creditWallet(
      order.userId,
      refundAmount,
      "order_cancellation",
      `Refund for cancelled item in Order #${order.orderId}`,
      order._id
    );

    order.refundAmount += refundAmount;
  }

  // 3. Update Status
  item.status = "Cancelled";
  item.cancelledAt = new Date();

  order.orderStatus = calculateOrderStatus(order.orderedItems);

  // If entire order is cancelled/refunded
  if (order.refundAmount >= order.finalAmount) {
    order.paymentStatus = "Refunded";
  }

  await order.save();
};

const rejectCancellation = async ({ orderId, itemId, reason }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const item = order.orderedItems.id(itemId);
  if (!item || item.status !== "Cancellation Requested") return;

  item.status = "Pending";
  item.cancelRejectReason = reason || "Cancellation request rejected by admin";

  order.orderStatus = calculateOrderStatus(order.orderedItems);
  await order.save();
};

export default {
  getAllOrders,
  getOrderDetails,
  updateItemStatus,
  getReturnRequests,
  approveReturn,
  rejectReturn,
  refundReturn,
  getCancellationRequests,
  approveCancellation,
  rejectCancellation
};