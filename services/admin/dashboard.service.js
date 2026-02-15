import Order from "../../models/order.model.js";
import User from "../../models/user.model.js";
import Product from "../../models/product.model.js";

class DashboardService {
    async getDashboardData() {
        try {
            const [
                totalUsers,
                totalOrders,
                totalProducts,
                revenueData,
                orderStatusData,
                topProducts,
                topCategories,
                topBrands,
                recentOrders,
                returnRequests
            ] = await Promise.all([
                User.countDocuments({ isAdmin: false }),
                Order.countDocuments(),
                Product.countDocuments({ isBlocked: false }),
                Order.aggregate([
                    { $match: { orderStatus: "Delivered" } },
                    { $group: { _id: null, totalRevenue: { $sum: "$finalAmount" } } }
                ]),
                Order.aggregate([
                    { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $unwind: "$orderedItems" },
                    {
                        $group: {
                            _id: "$orderedItems.product",
                            totalSold: { $sum: "$orderedItems.quantity" }
                        }
                    },
                    { $sort: { totalSold: -1 } },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "products",
                            localField: "_id",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    { $unwind: "$productDetails" }
                ]),
                Order.aggregate([
                    { $unwind: "$orderedItems" },
                    {
                        $lookup: {
                            from: "products",
                            localField: "orderedItems.product",
                            foreignField: "_id",
                            as: "product"
                        }
                    },
                    { $unwind: "$product" },
                    {
                        $group: {
                            _id: "$product.category",
                            totalSold: { $sum: "$orderedItems.quantity" }
                        }
                    },
                    { $sort: { totalSold: -1 } },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "categories",
                            localField: "_id",
                            foreignField: "_id",
                            as: "categoryDetails"
                        }
                    },
                    { $unwind: "$categoryDetails" }
                ]),
                Order.aggregate([
                    { $unwind: "$orderedItems" },
                    {
                        $lookup: {
                            from: "products",
                            localField: "orderedItems.product",
                            foreignField: "_id",
                            as: "product"
                        }
                    },
                    { $unwind: "$product" },
                    {
                        $group: {
                            _id: "$product.brand",
                            totalSold: { $sum: "$orderedItems.quantity" }
                        }
                    },
                    { $sort: { totalSold: -1 } },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "brands",
                            localField: "_id",
                            foreignField: "_id",
                            as: "brandDetails"
                        }
                    },
                    { $unwind: "$brandDetails" }
                ]),
                Order.find()
                    .populate("userId", "name email")
                    .sort({ createdAt: -1 })
                    .limit(5),
                Order.find({ orderStatus: "Return Requested" })
                    .populate("userId", "name email")
                    .sort({ createdAt: -1 })
                    .limit(5)
            ]);

            return {
                totalUsers,
                totalOrders,
                totalProducts,
                totalRevenue: revenueData[0]?.totalRevenue || 0,
                orderStatusData,
                topProducts,
                topCategories,
                topBrands,
                recentOrders,
                returnRequests
            };
        } catch (error) {
            console.error("Dashboard data fetch error:", error);
            throw error;
        }
    }
}

export default new DashboardService();
