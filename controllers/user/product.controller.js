import { getProductDetailsService } from "../../services/user/product.service.js";

const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    const { product, relatedProducts, unavailable } =
      await getProductDetailsService({ productId });

    return res.render("users/product-details", {
      product,
      relatedProducts,
      unavailable
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