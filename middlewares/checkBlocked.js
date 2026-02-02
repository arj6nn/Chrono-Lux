import User from "../models/user.model.js";

export default async (req, res, next) => {
  try {
    // If not logged in, continue normally
    if (!req.session.user) {
      res.locals.user = null;
      return next();
    }

    // Normalize session user ID (string OR object)
    const userId =
      typeof req.session.user === "string"
        ? req.session.user
        : req.session.user?.id;

    if (!userId) {
      req.session.user = null;
      res.locals.user = null;
      return next();
    }

    // Fetch user from DB
    const user = await User.findById(userId).lean();

    // User deleted
    if (!user) {
      req.session.destroy(() => { });
      res.locals.user = null;
      return res.redirect("/login");
    }

    // User blocked
    if (user.isBlocked) {
      req.session.destroy(() => { });
      res.locals.user = null;
      return res.redirect("/login?blocked=true");
    }

    // Make user available to navbar & views
    res.locals.user = user;
    next();

  } catch (error) {
    console.error("User block check error:", error);
    res.locals.user = null;
    next();
  }
};