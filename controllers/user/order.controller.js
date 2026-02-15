import { placeOrderService } from "../../services/user/order.service.js";
import { getOrderHistoryService } from "../../services/user/order.service.js";
import { getOrderDetailsService } from "../../services/user/order.service.js";
import { requestReturnService } from "../../services/user/order.service.js";
import { cancelSingleItemService } from "../../services/user/order.service.js";
import { cancelWholeOrderService } from "../../services/user/order.service.js";
import { generateInvoicePDF } from "../../services/user/order.service.js";

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const {
      addressId,
      payment,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = req.body;

    const appliedCouponId = req.session.appliedCouponId;

    if (!addressId || !payment) {
      throw new Error("INVALID_INPUT");
    }

    if (payment === "razorpay") {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new Error("INVALID_PAYMENT");
      }
    }

    const order = await placeOrderService({
      userId,
      addressId,
      payment,
      appliedCouponId,
      paymentDetails: payment === "razorpay"
        ? {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature
        }
        : null,
      paymentStatus: payment === "razorpay" ? "Paid" : "Pending"
    });

    delete req.session.appliedCouponId;

    return res.render("users/order-success", { order });

  } catch (error) {
    console.error("PLACE ORDER ERROR:", error.message);

    switch (error.message) {
      case "OUT_OF_STOCK":
        return res.redirect(`/checkout?error=OUT_OF_STOCK&payment=${payment}`);

      case "INVALID_PAYMENT":
        return res.redirect("/order/failure");

      case "INVALID_INPUT":
      case "INVALID_ADDRESS":
      case "INSUFFICIENT_WALLET_BALANCE":
      case "INVALID_COUPON":
        return res.redirect("/checkout");

      case "EMPTY_CART":
        return res.redirect("/cart");

      case "CART_UPDATED":
        return res.redirect("/cart?updated=true");

      default:
        return res.redirect("/order/failure");
    }
  }
};


const loadOrderHistory = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;

    const { orders, currentPage, totalPages } =
      await getOrderHistoryService({ userId, page });

    return res.render("users/order-history", {
      user: res.locals.user || req.session.user,
      orders,
      currentPage,
      totalPages
    });

  } catch (error) {
    console.error("Order history error:", error.message);

    if (error.message === "UNAUTHORIZED") {
      return res.redirect("/login");
    }

    return res.redirect("/profile/orders");
  }
};


const loadOrderDetails = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const orderId = req.params.orderId;

    const order = await getOrderDetailsService({
      userId,
      orderId
    });

    return res.render("users/order-details", {
      user: res.locals.user || req.session.user,
      order
    });

  } catch (error) {
    console.error("Order details error:", error.message);

    if (
      error.message === "UNAUTHORIZED" ||
      error.message === "INVALID_ORDER_ID" ||
      error.message === "ORDER_NOT_FOUND"
    ) {
      return res.redirect("/profile/orders");
    }

    return res.redirect("/profile/orders");
  }
};

const requestReturn = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.session.user.id;
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    await requestReturnService({
      userId,
      orderId,
      itemId,
      reason
    });

    return res.json({
      message: "Return request submitted successfully"
    });

  } catch (error) {
    console.error("Return request error:", error.message);

    const errorMap = {
      UNAUTHORIZED: { status: 401, message: "Unauthorized" },
      REASON_REQUIRED: { status: 400, message: "Return reason is required" },
      ORDER_NOT_FOUND: { status: 404, message: "Order not found" },
      ITEM_NOT_FOUND: { status: 404, message: "Item not found" },
      ITEM_NOT_DELIVERED: {
        status: 400,
        message: "Only delivered items can be returned"
      },
      RETURN_ALREADY_REQUESTED: {
        status: 400,
        message: "Return already requested"
      }
    };

    const err = errorMap[error.message];

    if (err) {
      return res.status(err.status).json({ message: err.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
};

const cancelSingleItem = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.session.user.id;
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const result = await cancelSingleItemService({
      userId,
      orderId,
      itemId,
      reason
    });

    return res.json({
      message: result.immediate ? "Item cancelled successfully" : "Cancellation request submitted",
      immediate: result.immediate
    });

  } catch (error) {
    console.error("Cancel single item error:", error.message);

    const errorMap = {
      UNAUTHORIZED: { status: 401, message: "Unauthorized" },
      REASON_REQUIRED: {
        status: 400,
        message: "Cancellation reason is required"
      },
      ORDER_NOT_FOUND: { status: 404, message: "Order not found" },
      ITEM_NOT_FOUND: { status: 404, message: "Item not found" },
      ITEM_NOT_CANCELLABLE: {
        status: 400,
        message: "This item cannot be cancelled"
      }
    };

    const err = errorMap[error.message];

    if (err) {
      return res.status(err.status).json({ message: err.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
};



const cancelWholeOrder = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.session.user.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    const result = await cancelWholeOrderService({
      userId,
      orderId,
      reason
    });

    return res.json({
      message: result.immediate ? "Order cancelled successfully" : "Cancellation request submitted",
      immediate: result.immediate
    });

  } catch (error) {
    console.error("Cancel whole order error:", error.message);

    const errorMap = {
      UNAUTHORIZED: { status: 401, message: "Unauthorized" },
      REASON_REQUIRED: {
        status: 400,
        message: "Cancellation reason is required"
      },
      ORDER_NOT_FOUND: { status: 404, message: "Order not found" },
      NO_ITEMS_CANCELLABLE: {
        status: 400,
        message: "No items eligible for cancellation"
      }
    };

    const err = errorMap[error.message];

    if (err) {
      return res.status(err.status).json({ message: err.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
};



const renderOrderFailure = async (req, res) => {
  try {
    const { orderId } = req.query;
    let order = null;

    if (orderId && req.session.user) {
      const userId = req.session.user.id;
      try {
        order = await getOrderDetailsService({ userId, orderId });
      } catch (err) {
        console.warn("Order details not found for failure page:", err.message);
      }
    }

    return res.render("users/order-failure", {
      order,
      user: res.locals.user || req.session.user,
      message: req.query.message
    });
  } catch (error) {
    console.error("Render Order Failure Error:", error.message);
    return res.redirect("/cart");
  }
};

const downloadInvoice = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const orderId = req.params.orderId;

    const { doc, filename } = await generateInvoicePDF({
      userId,
      orderId
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}`
    );

    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error("Download invoice error:", error.message);
    return res.redirect("/profile/orders");
  }
};

export default {
  placeOrder,
  loadOrderHistory,
  loadOrderDetails,
  requestReturn,
  cancelSingleItem,
  cancelWholeOrder,
  renderOrderFailure,
  downloadInvoice
};