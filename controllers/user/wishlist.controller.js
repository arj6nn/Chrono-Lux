import { 
  getWishlistByUserId,
  addProductToWishlist,
  removeProductFromWishlist 
 } from "../../services/user/wishlist.service.js";

const getWishlist = async (req, res) => {
  try {
    const wishlist = await getWishlistByUserId(req.user._id);

    res.render("users/wishlist", {
      wishlist: wishlist || { products: [] }
    });

  } catch (error) {
    console.error("Get wishlist error:", error);
    res.redirect("/");
  }
};


const addToWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Please login to add items to wishlist"
      });
    }

    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    const result = await addProductToWishlist(req.user._id, productId);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: "Added to wishlist"
    });

  } catch (error) {
    console.error("Add to wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};


const removeFromWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    await removeProductFromWishlist(req.user._id, productId);

    return res.status(200).json({
      success: true,
      message: "Removed from wishlist"
    });

  } catch (error) {
    console.error("Remove wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};