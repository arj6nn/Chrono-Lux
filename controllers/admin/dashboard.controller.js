import dashboardService from "../../services/admin/dashboard.service.js";

//DASHBOARD
const loadDashboard = async (req, res) => {
    try {
        const dashboardData = await dashboardService.getDashboardData();
        res.render("admins/dashboard", {
            activePage: "dashboard",
            ...dashboardData
        });
    } catch (error) {
        console.error("Dashboard calculation error:", error);
        res.render("admins/dashboard", {
            activePage: "dashboard",
            totalUsers: 0,
            totalOrders: 0,
            totalProducts: 0,
            totalRevenue: 0,
            orderStatusData: [],
            topProducts: [],
            topCategories: [],
            topBrands: [],
            recentOrders: []
        });
    }
};

export default { loadDashboard };