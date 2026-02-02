import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import { applyOffers } from "../../utils/offerUtils.js";

export const loadLandingPageService = async () => {
  // Featured products (latest, not blocked)
  const featuredProducts = await Product.find({
    isBlocked: false
  })
    .sort({ createdAt: -1 })
    .limit(4)
    .populate("brand", "brandName")
    .lean();

  // Listed & active categories
  const categories = await Category.find({
    isListed: true,
    isBlocked: false
  })
    .select("name description categoryImage categoryOffer")
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const featuredProductsWithOffers = await applyOffers(featuredProducts);

  return {
    featuredProducts: featuredProductsWithOffers,
    categories
  };
};

export const loadHomePageService = async () => {
  const featuredProducts = await Product.find({
    isBlocked: false
  })
    .sort({ createdAt: -1 })
    .limit(4)
    .populate("brand", "brandName")
    .lean();

  const categories = await Category.find({
    isListed: true,
    isBlocked: false
  })
    .select("name description categoryImage categoryOffer")
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const featuredProductsWithOffers = await applyOffers(featuredProducts);

  return {
    featuredProducts: featuredProductsWithOffers,
    categories
  };
};