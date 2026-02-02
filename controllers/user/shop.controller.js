import { loadShopPageService } from "../../services/user/shop.service.js";
import { liveSearchService } from "../../services/user/shop.service.js";

const loadShopPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const data = await loadShopPageService({
      page,
      filters: req.query
    });

    // AJAX / Fetch requests
    if (
      req.headers.accept &&
      req.headers.accept.includes("application/json")
    ) {
      return res.json({
        products: data.products,
        currentPage: data.currentPage,
        totalPages: data.totalPages
      });
    }

    // Normal page render
    return res.render("users/shop-page", data);

  } catch (error) {
    console.error("Shop load error FULL:", error);
    return res.status(500).send("Something went wrong loading shop");
  }
};

const liveSearch = async (req, res) => {
  try {
    const q = req.query.q;

    const results = await liveSearchService({
      query: q
    });

    return res.json(results);

  } catch (error) {
    console.error("Live search error:", error.message);
    return res.status(500).json([]);
  }
};

export {
  loadShopPage,
  liveSearch
};