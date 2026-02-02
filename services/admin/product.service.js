import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import Brand from "../../models/brand.model.js";
import mongoose from "mongoose";
import cloudinary from "../../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js";

/* ================= PRODUCT LIST ================= */

export async function getProductList({ page = 1, limit = 5, search = "" }) {
    const searchMatch = search
        ? {
            $or: [
                { productName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { "brand.brandName": { $regex: search, $options: "i" } },
                { "category.name": { $regex: search, $options: "i" } }
            ]
        }
        : {};

    const pipeline = [
        {
            $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "category"
            }
        },
        { $unwind: "$category" },
        {
            $lookup: {
                from: "brands",
                localField: "brand",
                foreignField: "_id",
                as: "brand"
            }
        },
        { $unwind: "$brand" },
        { $match: searchMatch }
    ];

    const products = await Product.aggregate([
        ...pipeline,
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ]);

    const countResult = await Product.aggregate([
        ...pipeline,
        { $count: "total" }
    ]);

    const totalProducts = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalProducts / limit);

    return { products, totalProducts, totalPages };
}

/* ================= PRODUCT JSON ================= */

export async function getProductById(productId) {
    const product = await Product.findById(productId)
        .populate("category")
        .populate("brand");

    if (!product) throw new Error("Product not found");
    return product;
}

/* ================= ADD PRODUCT ================= */

export async function createProduct({ body, files }) {
    const { productName, description, category, brand } = body;

    if (!productName || !description || !category || !brand) {
        throw new Error("All basic fields are required");
    }

    let variants = body.variants || [];

    if (typeof variants === "string") {
        variants = JSON.parse(variants);
    }

    variants = Array.isArray(variants) ? variants : Object.values(variants);
    variants = variants.filter(v => v && v.color);

    if (!variants.length) {
        throw new Error("At least one variant is required");
    }

    const allFiles = Array.isArray(files) ? files : [];

    for (let i = 0; i < variants.length; i++) {
        const fieldName = `variant_${i}_images`;
        const uploadedFiles = allFiles.filter(f => f.fieldname === fieldName);

        if (uploadedFiles.length < 3) {
            throw new Error(`Each variant must contain at least 3 images`);
        }

        const images = [];
        for (const file of uploadedFiles) {
            const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
            const uploadResult = await cloudinary.uploader.upload(dataUri, {
                folder: "products"
            });
            images.push(uploadResult.secure_url);
        }

        variants[i] = {
            ...variants[i],
            images,
            price: Number(variants[i].price) || 0,
            salesPrice: Number(variants[i].salesPrice) || 0,
            stock: Number(variants[i].stock) || 0
        };

        if (variants[i].salesPrice > variants[i].price) {
            throw new Error("Sales price cannot be higher than price");
        }
    }

    const product = new Product({
        productName,
        description,
        category,
        brand,
        variants
    });

    await product.save();
    return product;
}

/* ================= EDIT PRODUCT ================= */

export async function updateProduct({ productId, body, files }) {
    let variants = body.variants;

    if (typeof variants === "string") {
        variants = JSON.parse(variants);
    }

    if (!Array.isArray(variants) || !variants.length) {
        throw new Error("Product must contain at least one variant");
    }

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) throw new Error("Product not found");

    const update = {
        productName: body.productName?.trim(),
        description: body.description?.trim(),
        category: body.category,
        brand: body.brand,
        variants: []
    };

    for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        if (!variant) continue;

        const variantDbId = variant._id || null;
        const existingVariant = variantDbId
            ? existingProduct.variants.id(variantDbId)
            : null;

        const existingImages = Array.isArray(variant.remainingImages)
            ? variant.remainingImages
            : existingVariant?.images || [];

        const variantObj = {
            _id: variantDbId
                ? new mongoose.Types.ObjectId(variantDbId)
                : undefined,
            color: variant.color,
            dialSize: variant.dialSize,
            price: Number(variant.price) || 0,
            salesPrice: Number(variant.salesPrice) || 0,
            stock: Number(variant.stock) || 0,
            images: [...existingImages]
        };

        if (variantObj.salesPrice > variantObj.price) {
            throw new Error("Sales price cannot be higher than price");
        }

        const filesForVariant = (files || []).filter(
            f => f.fieldname === `variant_${variant.id}_images`
        );

        for (const file of filesForVariant) {
            const url = await uploadBufferToCloudinary(file.buffer);
            variantObj.images.push(url);
        }

        if (variantObj.images.length < 3) {
            throw new Error("Each variant must have at least 3 images");
        }

        update.variants.push(variantObj);
    }

    await Product.findByIdAndUpdate(productId, update);
}

/* ================= DELETE PRODUCT ================= */

export async function softDeleteProduct(productId) {
    await Product.findByIdAndUpdate(productId, { isDeleted: true });
}

/* ================= TOGGLE BLOCK ================= */

export async function toggleBlockProduct(productId) {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    product.isBlocked = !product.isBlocked;
    await product.save();
}

/* ================= DELETE VARIANT IMAGE ================= */

export async function removeVariantImage({ productId, variantId, imageIndex }) {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    const variant = product.variants.id(variantId);
    if (!variant) throw new Error("Variant not found");

    if (variant.images.length <= 1) {
        throw new Error("At least one image is required");
    }

    variant.images.splice(imageIndex, 1);
    await product.save();
}

/* ================= META DATA ================= */

export async function getCategoriesAndBrands() {
    const [categories, brands] = await Promise.all([
        Category.find(),
        Brand.find()
    ]);

    return { categories, brands };
}

/* ================= SEARCH PRODUCTS ================= */
export async function searchProducts(query) {
    if (!query) return [];
    return await Product.find({
        productName: { $regex: query, $options: "i" },
        isBlocked: { $ne: true },
        isDeleted: { $ne: true }
    })
        .limit(10)
        .populate("brand", "brandName")
        .populate("category", "name")
        .select("_id productName variants brand category");
}