import salesReportService from "../../services/admin/sales-report.service.js";

class SalesReportController {
    async loadSalesReport(req, res) {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const { filterType = 'daily', startDate = todayStr, endDate = todayStr } = req.query;
            const { orders, stats, chartLabels, chartValues } = await salesReportService.getSalesReport(filterType, startDate, endDate);

            res.render("admins/sales-report", {
                activePage: 'sales-report',
                orders,
                stats,
                filterType,
                startDate,
                endDate,
                chartLabels,
                chartValues
            });
        } catch (error) {
            console.error("Error in loadSalesReport:", error);
            res.redirect("/admin/pageerror");
        }
    }

    async downloadExcel(req, res) {
        try {
            const { filterType, startDate, endDate } = req.query;
            const { orders, stats } = await salesReportService.getSalesReport(filterType, startDate, endDate);

            const workbook = await salesReportService.generateExcel(orders, stats);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error("Error in downloadExcel:", error);
            res.status(500).send("Internal Server Error");
        }
    }

    async downloadPDF(req, res) {
        try {
            const { filterType, startDate, endDate } = req.query;
            const { orders, stats } = await salesReportService.getSalesReport(filterType, startDate, endDate);

            const doc = await salesReportService.generatePDF(orders, stats);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

            doc.pipe(res);
            doc.end();
        } catch (error) {
            console.error("Error in downloadPDF:", error);
            res.status(500).send("Internal Server Error");
        }
    }
}

export default new SalesReportController();
