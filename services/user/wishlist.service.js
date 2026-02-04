import Wishlist from "../../models/wishlist.model.js";
import Product from "../../models/product.model.js";
import { applyOffers } from "../../utils/offerUtils.js";

/**
 * Get wishlist by user ID
 * @param {String} userId
 * @returns {Object|null}
 */
export const getWishlistByUserId = async (userId) => {
  const wishlist = await Wishlist.findOne({ userId })
    .populate("products")
    .lean();

  if (wishlist && wishlist.products) {
    wishlist.products = await applyOffers(wishlist.products);
  }

  return wishlist;
};

import Cart from "../../models/cart.model.js";

/**
 * Add product to user's wishlist
 * @param {String} userId
 * @param {String} productId
 */
export const addProductToWishlist = async (userId, productId) => {
  // Check product existence
  const productExists = await Product.exists({ _id: productId });
  if (!productExists) {
    return { success: false, status: 404, message: "Product not found" };
  }

  // Check if product is already in cart
  const cart = await Cart.findOne({
    userId,
    "items.productId": productId
  });

  if (cart) {
    return { success: false, status: 400, message: "Product already in cart" };
  }

  await Wishlist.findOneAndUpdate(
    { userId },
    { $addToSet: { products: productId } },
    { upsert: true, new: true }
  );

  return { success: true };
};

/**
 * Remove product from user's wishlist
 * @param {String} userId
 * @param {String} productId
 */
export const removeProductFromWishlist = async (userId, productId) => {
  await Wishlist.updateOne(
    { userId },
    { $pull: { products: productId } }
  );

  return { success: true };
};