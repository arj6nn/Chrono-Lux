import Cart from "../models/cart.model.js";

const cartCount = async (req, res, next) => {
  if (!req.session.user) {
    res.locals.cartCount = 0;
    return next();
  }

  const cart = await Cart.findOne({ userId: req.session.user.id })
    .populate("items.productId");

  if (!cart) {
    res.locals.cartCount = 0;
    return next();
  }

  // ✅ count DISTINCT products only
  const validItems = cart.items.filter(item => item.productId);

  res.locals.cartCount = validItems.length;

  // Only save if items were removed
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
    console.log(`[MIDDLEWARE] Cleaned up ${cart.items.length - validItems.length} invalid items from cart`);
  }

  next();
};

export default cartCount;