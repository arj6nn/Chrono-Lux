import Category from "../../models/category.model.js";
import Offer from "../../models/offer.model.js";
import cloudinary from "../../config/cloudinary.js";
import streamifier from "streamifier";

/* ================= CLOUDINARY ================= */

const uploadCategoryImage = (buffer) => {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "chrono_lux_categories",
        resource_type: "image"
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(upload);
  });
};

/* ================= CATEGORY LOGIC ================= */

const getCategories = async ({ page, limit, search }) => {
  const query = {};
  search = search.trim();

  if (search.length > 0) {
    query.name = { $regex: new RegExp(`${search}`, "i") }; // Modified to search anywhere in name, not just start
  }

  const [totalCategories, categoriesRaw, activeOffers] = await Promise.all([
    Category.countDocuments(query),
    Category.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Offer.find({
      type: "CATEGORY",
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).lean()
  ]);

  // Attach active offer to each category
  const categories = categoriesRaw.map(cat => {
    const offer = activeOffers.find(o => o.applicableCategory?.toString() === cat._id.toString());
    return {
      ...cat,
      categoryOffer: offer ? offer.discountValue : 0,
      offerName: offer ? offer.name : null
    };
  });

  return {
    categories,
    totalPages: Math.ceil(totalCategories / limit)
  };
};

const createCategory = async ({ name, description, file }) => {
  name = name.trim();

  const exists = await Category.findOne({
    name: { $regex: `^${name}$`, $options: "i" }
  });

  if (exists) {
    throw new Error("CATEGORY_EXISTS");
  }

  if (!file) {
    throw new Error("IMAGE_REQUIRED");
  }

  const imageUrl = await uploadCategoryImage(file.buffer);

  return await Category.create({
    name,
    description: description?.trim(),
    categoryImage: imageUrl
  });
};

const updateCategory = async ({ id, name, description, file }) => {
  name = name.trim();

  const exists = await Category.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
    _id: { $ne: id }
  });

  if (exists) {
    throw new Error("CATEGORY_EXISTS");
  }

  const updateData = {
    name,
    description: description.trim()
  };

  if (file) {
    const imageUrl = await uploadCategoryImage(file.buffer);
    updateData.categoryImage = imageUrl;
  }

  return await Category.findByIdAndUpdate(id, updateData);
};

const toggleCategory = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  category.isListed = !category.isListed;
  await category.save();

  return category.isListed;
};

export default {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategory
};
