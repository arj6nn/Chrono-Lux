import mongoose from "mongoose";
import Cart from "../../models/cart.model.js";
import Product from "../../models/product.model.js";
import { applyOffers } from "../../utils/offerUtils.js";
import sanitizeCart from "../../utils/sanitizeCart.js";
import Wishlist from "../../models/wishlist.model.js";

export const getUserCart = async (userId) => {
  // Fetch cart with populated products
  let cart = await Cart.findOne({ userId }).populate({
    path: "items.productId",
    select: "productName variants brand category isBlocked"
  });

  if (!cart) return null;

  const { cart: sanitizedCart, reducedItems, removedItems } = await sanitizeCart(cart, Product);
  cart = sanitizedCart;

  const products = cart.items.map(item => item.productId);
  const productsWithOffers = await applyOffers(products);

  // Map updated products back to cart items
  const productMap = new Map();
  productsWithOffers.forEach(p => productMap.set(p._id.toString(), p));

  const formattedCart = cart.toObject();

  formattedCart.items = formattedCart.items
    .map(item => {
      const product = productMap.get(item.productId._id.toString());
      if (!product) return null;

      const variant = product.variants.find(
        v => v._id.toString() === item.variantId.toString()
      );

      if (!variant) return null;

      const unitPrice =
        variant.salesPrice > 0 ? variant.salesPrice : variant.price;

      return {
        ...item,
        product,
        variant,
        itemTotal: unitPrice * item.quantity
      };
    })
    .filter(Boolean);

  return { cart: formattedCart, reducedItems, removedItems };
};

export const addItemToCart = async ({
  userId,
  productId,
  variantId,
  quantity = 1
}) => {
  const qty = Math.max(1, parseInt(quantity));

  if (!userId || !productId || !variantId) {
    return { success: false, message: "Invalid request" };
  }

  const product = await Product.findById(productId);
  if (!product || product.isBlocked) {
    return { success: false, message: "Product unavailable" };
  }

  const variant = product.variants.id(variantId);
  if (!variant) {
    return { success: false, message: "Variant not found" };
  }

  if (variant.stock < qty) {
    return { success: false, message: "Insufficient stock" };
  }

  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  const existingItem = cart.items.find(
    item =>
      item.productId.toString() === productId &&
      item.variantId.toString() === variantId
  );

  if (existingItem) {
    if (existingItem.quantity + qty > variant.stock) {
      return { success: false, message: "Stock limit reached" };
    }
    existingItem.quantity += qty;
  } else {
    cart.items.push({ productId, variantId, quantity: qty });
  }

  await cart.save();

  // Remove from Wishlist if exists
  await Wishlist.updateOne(
    { userId },
    { $pull: { products: new mongoose.Types.ObjectId(productId) } }
  );

  // Fetch final counts directly from DB to be 100% accurate
  const [updatedCart, updatedWishlist] = await Promise.all([
    Cart.findOne({ userId }),
    Wishlist.findOne({ userId })
  ]);

  const cartCount = updatedCart ? updatedCart.items.filter(i => i.productId).length : 0;
  const wishlistCount = updatedWishlist ? updatedWishlist.products.length : 0;

  return {
    success: true,
    cartCount,
    wishlistCount
  };
};

export const removeItemFromCart = async ({ userId, itemId }) => {
  if (!userId || !itemId) {
    return { success: false, message: "Invalid request" };
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return { success: false, message: "Cart not found" };
  }

  const initialLength = cart.items.length;

  cart.items = cart.items.filter(
    item => item._id.toString() !== itemId
  );

  // Item not found in cart
  if (cart.items.length === initialLength) {
    return { success: false, message: "Item not found" };
  }

  await cart.save();

  const cartCount = cart.items.filter(i => i.productId).length;
  return { success: true, cartCount };
};

export const updateCartItemQuantity = async ({
  userId,
  itemId,
  action
}) => {
  if (!userId || !itemId || !action) {
    return { success: false, message: "Invalid request" };
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return { success: false, message: "Cart not found" };
  }

  const item = cart.items.id(itemId);
  if (!item) {
    return { success: false, message: "Item not found" };
  }

  let product = await Product.findById(item.productId).populate("category");
  if (!product || product.isBlocked) {
    item.remove();
    await cart.save();
    return {
      success: false,
      message: "Product is no longer available",
      removed: true
    };
  }

  // Apply offers to get the correct dynamic unit price
  product = await applyOffers(product);

  const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
  if (!variant) {
    return { success: false, message: "Variant not found" };
  }

  if (action === "increase") {
    if (item.quantity + 1 > variant.stock) {
      return { success: false, message: "Stock limit reached" };
    }
    item.quantity += 1;
  }

  if (action === "decrease") {
    item.quantity -= 1;
  }

  if (item.quantity <= 0) {
    item.remove();
    await cart.save();
    return { success: true, removed: true };
  }

  await cart.save();

  const unitPrice = variant.salesPrice > 0 ? variant.salesPrice : variant.price;

  return {
    success: true,
    quantity: item.quantity,
    itemTotal: unitPrice * item.quantity
  };
};