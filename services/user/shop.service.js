import mongoose from "mongoose";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import Brand from "../../models/brand.model.js";
import Offer from "../../models/offer.model.js";
import Wishlist from "../../models/wishlist.model.js";
import { applyOffers } from "../../utils/offerUtils.js";

export const loadShopPageService = async ({
  page = 1,
  limit = 12,
  filters = {},
  userId = null
}) => {
  const skip = (page - 1) * limit;
  const { category, brand, maxPrice, search, sort } = filters;

  /* ================= SIDEBAR DATA ================= */

  const categories = await Category.find({
    isListed: true,
    isBlocked: false
  }).select("_id name");

  const brands = await Brand.find({
    isBlocked: false
  }).select("_id brandName");

  const activeCategoryIds = categories.map(c => c._id);

  /* ================= BASE FILTER ================= */

  let baseFilter = {
    isBlocked: false,
    category: { $in: activeCategoryIds }
  };

  /* ================= SEARCH ================= */

  if (search && search.trim()) {
    baseFilter.productName = {
      $regex: search.trim(),
      $options: "i"
    };
  }

  /* ================= CATEGORY FILTER ================= */

  if (category) {
    const categoryIds = category
      .split(",")
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (categoryIds.length) {
      baseFilter.category = { $in: categoryIds };
    }
  }

  /* ================= BRAND FILTER ================= */

  if (brand) {
    const brandIds = brand
      .split(",")
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (brandIds.length) {
      baseFilter.brand = { $in: brandIds };
    }
  }

  /* ================= OFFERS DATA ================= */

  const now = new Date();
  const activeOffers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  });

  /* ================= SORTING ================= */

  let sortCriteria = {};
  let needsAggregation = true;

  switch (sort) {
    case "price-low-to-high":
      sortCriteria = { effectivePrice: 1 };
      break;
    case "price-high-to-low":
      sortCriteria = { effectivePrice: -1 };
      break;
    default:
      sortCriteria = { effectivePrice: 1 };
  }

  /* ================= PRODUCT FETCH ================= */

  let products = [];
  let totalProducts = 0;

  const MAX_PRICE = 1_000_000;
  const usePriceFilter =
    maxPrice && !isNaN(maxPrice) && Number(maxPrice) < MAX_PRICE;

  if (needsAggregation) {
    const priceLimit = usePriceFilter ? Number(maxPrice) : MAX_PRICE;

    // Build the offer logic for the pipeline
    const pipeline = [
      { $match: baseFilter },
      {
        $addFields: {
          // Find applicable product offers
          productOffer: {
            $filter: {
              input: activeOffers.filter(o => o.type === "PRODUCT").map(o => ({
                discountValue: o.discountValue,
                productIds: (o.applicableProducts || []).map(id => id?.toString())
              })),
              as: "o",
              cond: { $in: [{ $toString: "$_id" }, "$$o.productIds"] }
            }
          },
          // Find applicable category offers
          categoryOffer: {
            $filter: {
              input: activeOffers.filter(o => o.type === "CATEGORY").map(o => ({
                discountValue: o.discountValue,
                categoryId: o.applicableCategory?.toString() || ""
              })),
              as: "o",
              cond: { $eq: [{ $toString: "$category" }, "$$o.categoryId"] }
            }
          }
        }
      },
      {
        $addFields: {
          allDiscounts: { $concatArrays: ["$productOffer.discountValue", "$categoryOffer.discountValue"] }
        }
      },
      {
        $addFields: {
          maxDiscount: { $max: { $ifNull: ["$allDiscounts", [0]] } }
        }
      },
      {
        $addFields: {
          effectivePrice: {
            $min: {
              $map: {
                input: "$variants",
                as: "v",
                in: {
                  $floor: {
                    $subtract: [
                      "$$v.price",
                      { $divide: [{ $multiply: ["$$v.price", { $ifNull: ["$maxDiscount", 0] }] }, 100] }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    ];

    if (usePriceFilter) {
      pipeline.push({ $match: { effectivePrice: { $lte: priceLimit } } });
    }

    // Add sort to pipeline
    pipeline.push({ $sort: sortCriteria });

    const countResult = await Product.aggregate([
      ...pipeline,
      { $count: "count" }
    ]);

    totalProducts = countResult[0]?.count || 0;

    products = await Product.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit }
    ]);

    products = await Product.populate(products, [
      { path: "brand", select: "brandName" },
      { path: "category", select: "name" }
    ]);
  }

  /* ================= APPLY OFFERS ================= */
  const productsWithOffers = await applyOffers(products);

  /* ================= WISHLIST STATUS ================= */
  let wishlistProductIds = [];
  try {
    if (userId) {
      const wishlist = await Wishlist.findOne({ userId }).lean();
      if (wishlist && Array.isArray(wishlist.products)) {
        wishlistProductIds = wishlist.products
          .filter(id => id)
          .map(id => id.toString());
      }
    }
  } catch (err) {
    console.error("Wishlist fetch error (non-fatal):", err);
  }

  /* ================= FORMAT PRODUCTS ================= */

  const formattedProducts = productsWithOffers.map(p => {
    const v = p.variants?.[0] || {};
    const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
    return {
      id: p._id,
      productName: p.productName,
      category: p.category?.name,
      brand: p.brand?.brandName,
      price: v.price,
      salesPrice: v.salesPrice,
      appliedOffer: v.appliedOffer,
      image: v.images?.[0],
      totalStock: totalStock,
      isInWishlist: wishlistProductIds.includes(p._id.toString())
    };
  });

  return {
    categories,
    brands,
    products: formattedProducts,
    currentPage: page,
    totalPages: Math.ceil(totalProducts / limit),
    filters
  };
};

export const liveSearchService = async ({ query, limit = 6, userId = null }) => {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const q = query.trim();

  const products = await Product.find({
    isBlocked: false,
    productName: { $regex: q, $options: "i" }
  })
    .limit(limit)
    .select("productName variants")
    .lean();

  const productsWithOffers = await applyOffers(products);

  /* ================= WISHLIST STATUS ================= */
  let wishlistProductIds = [];
  try {
    if (userId) {
      const wishlist = await Wishlist.findOne({ userId }).lean();
      if (wishlist && Array.isArray(wishlist.products)) {
        wishlistProductIds = wishlist.products
          .filter(id => id)
          .map(id => id.toString());
      }
    }
  } catch (err) {
    console.error("Wishlist fetch error (non-fatal):", err);
  }

  return productsWithOffers.map(p => {
    const v = p.variants?.[0] || {};
    const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
    return {
      id: p._id,
      productName: p.productName,
      price: v.price,
      salesPrice: v.salesPrice,
      appliedOffer: v.appliedOffer,
      image: v.images?.[0],
      totalStock: totalStock,
      isInWishlist: wishlistProductIds.includes(p._id.toString())
    };
  });
};