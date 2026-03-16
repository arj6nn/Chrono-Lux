import { loadLandingPageService } from "../../services/user/page.service.js";
import { loadHomePageService } from "../../services/user/page.service.js";

// 404 PAGE
const pageNotFound = async (req, res) => {
  try {
    res.render("users/page-404");
  } catch (error) {
    res.redirect("users/page-404");
  }
};

// LANDING PAGE
const loadLandingPage = async (req, res) => {
  try {
    const { featuredProducts, categories } =
      await loadLandingPageService();

    return res.render("users/landing", {
      featuredProducts,
      categories
    });

  } catch (error) {
    console.error("Landing page error:", error.message);
    return res.status(500).send("Server error");
  }
};

// HOME PAGE
const loadHomePage = async (req, res) => {
  try {
    // UI-only session flag
    const success = req.session.loginSuccess;
    req.session.loginSuccess = null;

    const { featuredProducts, categories } =
      await loadHomePageService();

    return res.render("users/home", {
      success,
      featuredProducts,
      categories
    });

  } catch (error) {
    console.error("Home page error:", error.message);
    return res.status(500).send("Server error");
  }
};

// SIGNUP PAGE
const loadSignup = async (req, res) => {
  try {
    return res.render("users/signup", { message: null, formData: {} });
  } catch (error) {
    res.status(500).send("Server error");
  }
};

// LOGIN PAGE
const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("users/login", { message: null, blocked: false });
    } else {
      return res.redirect("/home");
    }
  } catch (error) {
    res.redirect("/users/page-404");
  }
};

// ABOUT PAGE
const loadAboutPage = async (req, res) => {
  try {
    return res.render("users/about");
  } catch (error) {
    console.error("About page error:", error.message);
    res.redirect("/pageNotFound");
  }
};

// CONTACT PAGE
const loadContactPage = async (req, res) => {
  try {
    return res.render("users/contact");
  } catch (error) {
    console.error("Contact page error:", error.message);
    res.redirect("/pageNotFound");
  }
};

export {
  pageNotFound,
  loadLandingPage,
  loadHomePage,
  loadSignup,
  loadLogin,
  loadAboutPage,
  loadContactPage
};