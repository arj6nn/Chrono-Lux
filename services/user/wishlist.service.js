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

  const wishlist = await Wishlist.findOneAndUpdate(
    { userId },
    { $addToSet: { products: productId } },
    { upsert: true, new: true }
  );

  return { success: true, wishlistCount: wishlist.products.length };
};

/**
 * Remove product from user's wishlist
 * @param {String} userId
 * @param {String} productId
 */
export const removeProductFromWishlist = async (userId, productId) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { userId },
    { $pull: { products: productId } },
    { new: true }
  );

  return { success: true, wishlistCount: wishlist ? wishlist.products.length : 0 };
};

/**
 * Check if a product is in the user's wishlist
 * @param {String} userId
 * @param {String} productId
 * @returns {Boolean}
 */
export const isProductInWishlist = async (userId, productId) => {
  if (!userId) return false;
  const wishlist = await Wishlist.findOne({ userId, products: productId });
  return !!wishlist;
};