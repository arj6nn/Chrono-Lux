import Order from "../../models/order.model.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit-table";

class SalesReportService {
    async getSalesReport(filterType, startDate, endDate) {
        let query = {
            orderStatus: "Delivered"
        };

        const now = new Date();
        if (filterType === 'daily') {
            const today = new Date(now.setHours(0, 0, 0, 0));
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            query.createdAt = { $gte: today, $lt: tomorrow };
        } else if (filterType === 'weekly') {
            const lastWeek = new Date(now);
            lastWeek.setDate(now.getDate() - 7);
            query.createdAt = { $gte: lastWeek };
        } else if (filterType === 'monthly') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            query.createdAt = { $gte: startOfMonth };
        } else if (filterType === 'yearly') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            query.createdAt = { $gte: startOfYear };
        } else if (filterType === 'custom' && startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }

        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: 1 }); // Sort ascending for chart

        // Calculate stats
        const stats = {
            totalSalesCount: orders.length,
            totalOrderAmount: orders.reduce((acc, order) => acc + order.totalPrice, 0),
            totalDiscount: orders.reduce((acc, order) => acc + (order.discount || 0) + (order.couponDiscount || 0), 0),
            finalAmount: orders.reduce((acc, order) => acc + order.finalAmount, 0)
        };

        // Prepare chart data
        const chartData = this._prepareChartData(orders, filterType, startDate, endDate);

        return {
            orders: [...orders].reverse(), // Return reversed for the table (newest first)
            stats,
            chartLabels: chartData.labels,
            chartValues: chartData.values
        };
    }

    _prepareChartData(orders, filterType, startDate, endDate) {
        const labels = [];
        const values = [];
        const map = new Map();
        const now = new Date();

        if (filterType === 'daily') {
            // Match reference: show discrete orders as individual points for 'Today'
            orders.forEach(order => {
                const label = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                labels.push(label);
                values.push(Number(order.finalAmount));
            });
            if (labels.length === 0) {
                const label = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                labels.push(label);
                values.push(0);
            }
            return { labels, values };
        }

        // For other views: Pre-fill labels for continuity
        if (filterType === 'weekly') {
            const start = new Date(now);
            start.setDate(now.getDate() - 6);
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                map.set(label, 0);
                labels.push(label);
            }
        } else if (filterType === 'monthly') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= lastDay; i++) {
                const d = new Date(now.getFullYear(), now.getMonth(), i);
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                map.set(label, 0);
                labels.push(label);
            }
        } else if (filterType === 'yearly') {
            for (let i = 0; i < 12; i++) {
                const label = new Date(now.getFullYear(), i, 1).toLocaleString('default', { month: 'short' });
                map.set(label, 0);
                labels.push(label);
            }
        } else if (filterType === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            for (let i = 0; i < days; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                map.set(label, 0);
                labels.push(label);
            }
        }

        // Aggregate orders into pre-filled buckets
        orders.forEach(order => {
            const d = new Date(order.createdAt);
            let label;
            if (filterType === 'yearly') {
                label = d.toLocaleString('default', { month: 'short' });
            } else {
                label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }

            if (map.has(label)) {
                map.set(label, map.get(label) + order.finalAmount);
            } else {
                // Should only happen if order is outside pre-filled range (unlikely)
                map.set(label, order.finalAmount);
                if (!labels.includes(label)) labels.push(label);
            }
        });

        // Ensure proper chronological order for values
        if (filterType !== 'yearly') {
            labels.sort((a, b) => new Date(a) - new Date(b));
        }

        const finalValues = labels.map(l => Number(map.get(l) || 0));
        return { labels, values: finalValues };
    }

    async generateExcel(orders, stats) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Customer', key: 'customer', width: 20 },
            { header: 'Payment', key: 'payment', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Final Amount', key: 'final', width: 15 }
        ];

        orders.forEach(order => {
            worksheet.addRow({
                orderId: order.orderId,
                date: order.createdAt.toLocaleDateString(),
                customer: order.userId ? order.userId.name : 'Unknown',
                payment: order.paymentMethod,
                amount: order.totalPrice,
                discount: order.discount + order.couponDiscount,
                final: order.finalAmount
            });
        });

        worksheet.addRow([]);
        worksheet.addRow({ orderId: 'TOTALS', amount: stats.totalOrderAmount, discount: stats.totalDiscount, final: stats.finalAmount });

        return workbook;
    }

    async generatePDF(orders, stats) {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        doc.fontSize(18).text('Chrono Lux - Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        const table = {
            title: "Orders Summary",
            headers: ["Order ID", "Date", "Customer", "Method", "Amount", "Discount", "Final"],
            rows: orders.map(order => [
                order.orderId,
                order.createdAt.toLocaleDateString(),
                order.userId ? order.userId.name : 'Unknown',
                order.paymentMethod,
                `INR ${order.totalPrice}`,
                `INR ${order.discount + order.couponDiscount}`,
                `INR ${order.finalAmount}`
            ])
        };

        await doc.table(table, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
            prepareRow: (row, index, column, rect, rowIndex, columnIndex) => doc.font("Helvetica").fontSize(10),
        });

        doc.moveDown();
        doc.fontSize(12).font("Helvetica-Bold").text(`Total Orders: ${stats.totalSalesCount}`);
        doc.text(`Total Sales: INR ${stats.totalOrderAmount}`);
        doc.text(`Total Discount: INR ${stats.totalDiscount}`);
        doc.text(`Net Revenue: INR ${stats.finalAmount}`);

        return doc;
    }
}

export default new SalesReportService();
