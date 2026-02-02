import orderService from "../../services/admin/order.service.js";

//ORDERS

const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { orders, totalPages, totalOrders } = await orderService.getAllOrders(page, limit);

    res.render("admins/order-management", {
      activePage: "orders",
      orders,
      totalPages,
      currentPage: page,
      totalOrders
    });
  } catch (error) {
    console.error("Admin getAllOrders error:", error);
    res.redirect("/admin");
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const order = await orderService.getOrderDetails(req.params.id);

    res.render("admins/order-details", {
      activePage: "orders",
      order
    });
  } catch (error) {
    console.error("Admin getOrderDetails error:", error);
    res.redirect("/admin/orders");
  }
};

//ITEM STATUS

const updateItemStatus = async (req, res) => {
  try {
    await orderService.updateItemStatus({
      orderId: req.params.orderId,
      itemId: req.params.itemId,
      newStatus: req.body.status
    });

    res.redirect(`/admin/orders/${req.params.orderId}`);
  } catch (error) {
    console.error(error);
    res.redirect("/admin/orders");
  }
};

//RETURNS

const getReturnRequests = async (req, res) => {
  try {
    const orders = await orderService.getReturnRequests();
    res.render("admins/return-requests", { orders });
  } catch (error) {
    console.error(error);
    res.redirect("/admin");
  }
};

const approveReturn = async (req, res) => {
  try {
    await orderService.approveReturn(req.params);
    res.redirect(`/admin/orders/${req.params.orderId}`);
  } catch (error) {
    console.error(error);
    res.redirect("/admin/orders");
  }
};

const rejectReturn = async (req, res) => {
  try {
    await orderService.rejectReturn({
      ...req.params,
      reason: req.body.reason
    });

    res.redirect(`/admin/orders/${req.params.orderId}`);
  } catch (error) {
    console.error(error);
    res.redirect("/admin/orders");
  }
};

const refundReturn = async (req, res) => {
  try {
    await orderService.refundReturn(req.params);
    res.redirect(`/admin/orders/${req.params.orderId}`);
  } catch (error) {
    console.error(error);
    res.redirect("/admin/orders");
  }
};

const getCancellationRequests = async (req, res) => {
  try {
    const orders = await orderService.getCancellationRequests();
    res.render("admins/cancellation-requests", { orders });
  } catch (error) {
    console.error(error);
    res.redirect("/admin");
  }
};

const approveCancellation = async (req, res) => {
  try {
    await orderService.approveCancellation(req.params);
    res.redirect(`/admin/orders/${req.params.orderId}`);
  } catch (error) {
    console.error(error);
    res.redirect("/admin/orders");
  }
};

const rejectCancellation = async (req, res) => {
  try {
    await orderService.rejectCancellation({
      ...req.params,
      reason: req.body.reason
    });
    res.redirect(`/admin/orders/${req.params.orderId}`);
  } catch (error) {
    console.error(error);
    res.redirect("/admin/orders");
  }
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