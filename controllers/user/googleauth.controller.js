import { prepareGoogleSessionUser } from "../../services/user/googleAuth.service.js";

/* ================= GOOGLE AUTH SUCCESS ================= */

export const googleAuth = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const sessionUser = prepareGoogleSessionUser(req.user);

    if (!sessionUser) {
      return res.redirect("/login");
    }

    req.session.user = sessionUser;

    return res.redirect("/home");

  } catch (error) {
    console.error("Google auth error:", error);
    return res.redirect("/login");
  }
};
