import categoryService from "../../services/admin/category.service.js";

const loadCategoryManagement = async (req, res) => {
  try {
    let { page = 1, search = "" } = req.query;
    page = Number(page);

    const limit = 5;

    const { categories, totalPages } =
      await categoryService.getCategories({
        page,
        limit,
        search
      });

    res.render("admins/category-management", {
      activePage: "categories",
      categories,
      page,
      totalPages,
      search
    });

  } catch (error) {
    console.error(error);
    res.redirect("/admin/pageerror");
  }
};

// ADD CATEGORY
const addCategory = async (req, res) => {
  try {
    await categoryService.createCategory({
      name: req.body.name,
      description: req.body.description,
      categoryOffer: req.body.categoryOffer,
      file: req.file
    });

    res.json({
      success: true,
      message: "Category added successfully"
    });

  } catch (err) {
    console.error(err);

    if (err.message === "CATEGORY_EXISTS") {
      return res.json({ success: false, message: "Category already exists" });
    }

    if (err.message === "IMAGE_REQUIRED") {
      return res.json({ success: false, message: "Category image is required" });
    }

    res.json({ success: false, message: "Something went wrong" });
  }
};

// EDIT CATEGORY
const editCategory = async (req, res) => {
  try {
    await categoryService.updateCategory({
      id: req.params.id,
      name: req.body.name,
      description: req.body.description,
      categoryOffer: req.body.categoryOffer,
      file: req.file
    });

    res.redirect("/admin/categories");

  } catch (err) {
    console.error(err);
    res.redirect("/admin/pageerror");
  }
};

// TOGGLE CATEGORY ACTIVE / INACTIVE
const toggleCategoryStatus = async (req, res) => {
  try {
    const status = await categoryService.toggleCategory(req.params.id);
    res.json({ success: true, status });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

export default {
  loadCategoryManagement,
  addCategory,
  editCategory,
  toggleCategoryStatus
};
