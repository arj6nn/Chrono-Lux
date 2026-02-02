import Product from "../../models/product.model.js";
import { applyOffers } from "../../utils/offerUtils.js";

export const getProductDetailsService = async ({ productId }) => {
  if (!productId) {
    throw new Error("INVALID_PRODUCT_ID");
  }

  const product = await Product.findById(productId)
    .populate({
      path: "category",
      select: "name isListed isBlocked"
    })
    .populate({
      path: "brand",
      select: "brandName isBlocked"
    });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const unavailable =
    product.isBlocked ||
    !product.category ||
    product.category.isBlocked ||
    !product.category.isListed ||
    product.brand?.isBlocked;

  let relatedProducts = [];

  if (!unavailable) {
    // 1️⃣ Same-brand related products
    relatedProducts = await Product.find({
      isBlocked: false,
      brand: product.brand._id,
      _id: { $ne: product._id }
    })
      .limit(4)
      .lean();

    // 2️⃣ Fill remaining slots with random products
    if (relatedProducts.length < 4) {
      const remaining = 4 - relatedProducts.length;

      const excludeIds = relatedProducts.map(p => p._id);
      excludeIds.push(product._id);

      const randomProducts = await Product.aggregate([
        {
          $match: {
            isBlocked: false,
            _id: { $nin: excludeIds }
          }
        },
        { $sample: { size: remaining } }
      ]);

      relatedProducts = [...relatedProducts, ...randomProducts];

      // Populate after aggregation
      relatedProducts = await Product.populate(relatedProducts, [
        { path: "brand", select: "brandName" },
        { path: "category", select: "name" }
      ]);
    }
  }

  // Apply offers to the main product
  const productWithOffers = await applyOffers(product);

  // Apply offers to related products
  if (relatedProducts.length > 0) {
    relatedProducts = await applyOffers(relatedProducts);
  }

  return {
    product: productWithOffers,
    relatedProducts,
    unavailable
  };
};