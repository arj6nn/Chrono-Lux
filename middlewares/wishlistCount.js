import Wishlist from "../models/wishlist.model.js";

const wishlistCount = async (req, res, next) => {
  if (!req.session.user) {
    res.locals.wishlistCount = 0;
    return next();
  }

  const wishlist = await Wishlist.findOne({ userId: req.session.user.id });

  if (!wishlist) {
    res.locals.wishlistCount = 0;
    return next();
  }

  res.locals.wishlistCount = wishlist.products.length;

  next();
};

export default wishlistCount;