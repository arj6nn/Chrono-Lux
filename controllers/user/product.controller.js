import { getProductDetailsService } from "../../services/user/product.service.js";
import { isProductInWishlist } from "../../services/user/wishlist.service.js";

const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.user ? req.session.user.id : null;

    const { product, relatedProducts, unavailable } =
      await getProductDetailsService({ productId });

    const isInWishlist = await isProductInWishlist(userId, productId);

    return res.render("users/product-details", {
      product,
      relatedProducts,
      unavailable,
      isInWishlist
    });

  } catch (error) {
    console.error("Product details load error:", error.message);

    if (
      error.message === "INVALID_PRODUCT_ID" ||
      error.message === "PRODUCT_NOT_FOUND"
    ) {
      return res.status(404).render("users/page-404");
    }

    return res.status(500).render("users/500");
  }
};

export {
  loadProductDetails
};