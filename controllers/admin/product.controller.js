import * as productService from "../../services/admin/product.service.js";

/* ================= LOAD PAGE ================= */
export const loadProductPage = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const search = req.query.search?.trim() || "";

        const { products, totalPages, totalProducts } =
            await productService.getProductList({ page, search });

        const { categories, brands } =
            await productService.getCategoriesAndBrands();

        res.render("admins/product-management", {
            products,
            categories,
            brands,
            page,
            totalPages,
            totalProducts,
            search,
            admin: req.session.admin,
            activePage: "products"
        });
    } catch (err) {
        console.log(err);
        res.redirect("/admin/pageerror");
    }
};

export const getProductJson = async (req, res) => {
    try {
        const product = await productService.getProductById(req.params.productId);
        res.json({ success: true, product });
    } catch (err) {
        res.status(404).json({ success: false, message: err.message });
    }
};

export const addProduct = async (req, res) => {
    try {
        const product = await productService.createProduct({
            body: req.body,
            files: req.files
        });
        res.json({ success: true, product });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const editProduct = async (req, res) => {
    try {
        await productService.updateProduct({
            productId: req.params.productId,
            body: req.body,
            files: req.files
        });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        await productService.softDeleteProduct(req.params.id);
        res.redirect("/admin/products");
    } catch (err) {
        res.redirect("/admin/pageerror");
    }
};

export const toggleProductBlock = async (req, res) => {
    try {
        await productService.toggleBlockProduct(req.params.id);
        res.json({ success: true });
    } catch {
        res.json({ success: false });
    }
};

export const deleteVariantImage = async (req, res) => {
    try {
        await productService.removeVariantImage(req.body);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

export const searchProducts = async (req, res) => {
    try {
        const query = req.query.q || "";
        const products = await productService.searchProducts(query);
        res.json(products);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
