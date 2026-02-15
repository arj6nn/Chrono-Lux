import PDFDocument from "pdfkit-table";
import Cart from "../../models/cart.model.js";
import Product from "../../models/product.model.js";
import Order from "../../models/order.model.js";
import Address from "../../models/address.model.js";
import calculateOrderStatus from "../../utils/calculateOrderStatus.js";
import { applyOffers } from "../../utils/offerUtils.js";
import Coupon from "../../models/coupon.model.js";
import * as walletService from "./wallet.service.js";
import sanitizeCart from "../../utils/sanitizeCart.js";

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

  //    4. Validate cart items (Consistency check with sanitizeCart)
  const { reducedItems, removedItems } = await sanitizeCart(cart, Product);

  if (reducedItems.length > 0 || removedItems.length > 0) {
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
    } else {
      throw new Error("INVALID_COUPON");
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


  //     8.6. Reduce stock atomically
  const updatedItems = [];
  try {
    for (const item of orderedItems) {
      const result = await Product.updateOne(
        {
          _id: item.product,
          "variants._id": item.variantId,
          "variants.stock": { $gte: item.quantity }
        },
        { $inc: { "variants.$.stock": -item.quantity } }
      );

      if (result.modifiedCount === 0) {
        if (payment === "razorpay") {
          // Refund to wallet since payment is already processed
          await walletService.creditWallet(
            userId,
            finalAmount,
            "wallet_refund",
            "Refund for Order Cancellation (Stock Out)"
          );
        }
        throw new Error("OUT_OF_STOCK");
      }
      updatedItems.push(item);
    }
  } catch (err) {
    // Rollback stock for already processed items in this loop
    for (const item of updatedItems) {
      await Product.updateOne(
        { _id: item.product, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": item.quantity } }
      );
    }
    throw err;
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
    try {
      await walletService.debitWallet(
        userId,
        finalAmount,
        "order_payment",
        `Payment for Order #${order.orderId}`,
        order._id
      );
    } catch (err) {
      // If wallet debit fails, we must rollback stock and delete the order
      for (const item of orderedItems) {
        await Product.updateOne(
          { _id: item.product, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": item.quantity } }
        );
      }
      await Order.deleteOne({ _id: order._id });
      throw err;
    }
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

export const generateInvoicePDF = async ({ userId, orderId }) => {
  const order = await Order.findOne({ _id: orderId, userId }).populate(
    "orderedItems.product"
  );

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const filename = `invoice-${order.orderId}.pdf`;

  // --- Header / Brand ---
  doc.fillColor("#000000").fontSize(25).font("Helvetica-Bold").text("CHRONO LUX", { align: "center", characterSpacing: 2 });
  doc.fontSize(10).font("Helvetica").text("PREMIUM TIMEPIECES", { align: "center" });

  doc.moveDown(2);

  // Shop Details (Left) vs Invoice Info (Right)
  const startY = doc.y;
  doc.fontSize(10).font("Helvetica-Bold").text("Sold By:", 40, startY);
  doc.font("Helvetica").text("CHRONO LUX PVT LTD");
  doc.text("3rd Floor, Technopark Phase 1");
  doc.text("Kochi, Kerala - 682024");
  doc.text("GSTIN: 32AABCC1234D1Z5");

  doc.font("Helvetica-Bold").text("Invoice Detail:", 350, startY);
  doc.font("Helvetica").text(`Invoice No: INV-${order.orderId}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`);
  doc.text(`Order ID: ${order.orderId}`);
  doc.text(`Payment: ${order.paymentMethod}`);
  doc.text(`Status: ${order.paymentStatus}`);

  doc.moveDown(2);
  doc.rect(40, doc.y, 515, 0.5).fill("#000000"); // Separator line
  doc.moveDown(1.5);

  // --- Billed To and Shipping ---
  const billedY = doc.y;
  doc.fontSize(12).font("Helvetica-Bold").text("Billed To:", 40, billedY);
  doc.fontSize(10).font("Helvetica").text(order.address.name);
  doc.text(order.address.line1);
  if (order.address.line2) doc.text(order.address.line2);
  doc.text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`);
  doc.text(`Phone: ${order.address.phone}`);

  doc.moveDown(3);

  // --- Items Table ---
  const table = {
    headers: ["Product", "Qty", "MRP", "Offer", "Price", "Total"],
    rows: order.orderedItems.map((item) => [
      item.product?.productName || "Product",
      item.quantity.toString(),
      `${item.mrp.toLocaleString("en-IN")}`,
      item.appliedOffer ? `${item.appliedOffer.discountValue}%` : "0%",
      `${item.price.toLocaleString("en-IN")}`,
      `${(item.price * item.quantity).toLocaleString("en-IN")}`,
    ]),
  };

  // Reset doc.x to ensure table starts from left margin
  doc.x = 40;

  await doc.table(table, {
    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
    prepareRow: (row, index, column, rect, rowIndex, columnIndex) =>
      doc.font("Helvetica").fontSize(10),
    width: 515,
    columnsSize: [180, 40, 75, 60, 80, 80], // Total 515
    padding: 5,
  });

  doc.moveDown();

  // --- Summary ---
  const summaryX = 350;
  const valueX = 480;

  const drawLine = (label, value, isBold = false) => {
    const currentY = doc.y;
    if (isBold) doc.font("Helvetica-Bold").fontSize(11);
    else doc.font("Helvetica").fontSize(10);

    doc.text(label, summaryX, currentY);
    doc.text(`INR ${value}`, valueX, currentY, { width: 75, align: "right" });
    doc.moveDown(0.8);
  };

  drawLine("Subtotal (MRP):", order.totalPrice.toLocaleString("en-IN"));
  drawLine("Product Discount:", `- ${order.discount.toLocaleString("en-IN")}`);

  if (order.couponDiscount > 0) {
    drawLine(`Coupon (${order.couponCode}):`, `- ${order.couponDiscount.toLocaleString("en-IN")}`);
  }

  const deliveryFee = order.finalAmount - (order.totalPrice - order.discount - order.couponDiscount);
  drawLine("Delivery:", deliveryFee > 0 ? deliveryFee.toLocaleString("en-IN") : "0 (FREE)");

  doc.moveDown(0.5);
  doc.rect(summaryX, doc.y, 205, 1).fill("#000000");
  doc.moveDown(1);

  drawLine("Total Amount:", order.finalAmount.toLocaleString("en-IN"), true);

  doc.moveDown(4);
  doc.font("Helvetica-Oblique").fontSize(10).text("Thank you for shopping with Chrono Lux!", { align: "center" });

  return { doc, filename };
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