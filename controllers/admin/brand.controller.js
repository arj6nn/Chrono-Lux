import brandService from "../../services/admin/brand.service.js";


const loadBrandManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || "";

    const { brands, totalPages } = await brandService.getBrands({
      page,
      limit,
      search
    });

    res.render("admins/brand-management", {
      activePage: "brands",
      brands,
      currentPage: page,
      totalPages,
      search
    });

  } catch (err) {
    console.error(err);
    res.redirect("/admin/pageerror");
  }
};

const addBrand = async (req, res) => {
  try {
    await brandService.createBrand({
      name: req.body.name,
      file: req.file
    });

    res.redirect("/admin/brands");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/pageerror");
  }
};

const editBrand = async (req, res) => {
  try {
    await brandService.updateBrand({
      id: req.params.id,
      name: req.body.name,
      file: req.file
    });

    res.redirect("/admin/brands");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/pageerror");
  }
};

const softDeleteBrand = async (req, res) => {
  try {
    await brandService.blockBrand(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("softDeleteBrand error:", err);
    res.status(500).json({ success: false });
  }
};

const restoreBrand = async (req, res) => {
  try {
    await brandService.restoreBrandById(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("restoreBrand error:", err);
    res.status(500).json({ success: false });
  }
};

export default {
  loadBrandManagement,
  addBrand,
  editBrand,
  softDeleteBrand,
  restoreBrand
};
