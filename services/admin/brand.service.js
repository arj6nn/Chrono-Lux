import Brand from "../../models/brand.model.js";
import Product from "../../models/product.model.js";
import cloudinary from "../../config/cloudinary.js";
import streamifier from "streamifier";

/* ================= CLOUDINARY ================= */

const uploadBrandImage = (buffer) => {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder: "chrono_lux_brands", resource_type: "image" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(upload);
  });
};

/* ================= BRAND LOGIC ================= */

const getBrands = async ({ page, limit, search }) => {
  const skip = (page - 1) * limit;

  const matchStage = {
    brandName: { $regex: search, $options: "i" }
  };

  const totalBrands = await Brand.countDocuments(matchStage);
  const totalPages = Math.ceil(totalBrands / limit);

  const brands = await Brand.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "brand",
        as: "products"
      }
    },
    {
      $addFields: {
        productCount: {
          $size: {
            $filter: {
              input: "$products",
              as: "product",
              cond: { $eq: ["$$product.isBlocked", false] }
            }
          }
        }
      }
    },
    {
      $project: {
        brandName: 1,
        brandImage: 1,
        isBlocked: 1,
        productCount: 1
      }
    },
    { $sort: { brandName: 1 } },
    { $skip: skip },
    { $limit: limit }
  ]);

  return { brands, totalPages };
};

const createBrand = async ({ name, file }) => {
  let imageUrl = null;

  if (file) {
    imageUrl = await uploadBrandImage(file.buffer);
  }

  return await Brand.create({
    brandName: name.trim(),
    brandImage: [imageUrl]
  });
};

const updateBrand = async ({ id, name, file }) => {
  const updates = { brandName: name.trim() };

  if (file) {
    const imageUrl = await uploadBrandImage(file.buffer);
    updates.brandImage = [imageUrl];
  }

  return await Brand.findByIdAndUpdate(id, updates);
};

const blockBrand = async (brandId) => {
  const brand = await Brand.findByIdAndUpdate(
    brandId,
    { isBlocked: true, deletedAt: new Date() },
    { new: true }
  );

  if (!brand) throw new Error("BRAND_NOT_FOUND");

  await Product.updateMany(
    { brand: brandId },
    { $set: { isBlocked: true } }
  );

  return true;
};

const restoreBrandById = async (brandId) => {
  const brand = await Brand.findByIdAndUpdate(
    brandId,
    { isBlocked: false, deletedAt: null },
    { new: true }
  );

  if (!brand) throw new Error("BRAND_NOT_FOUND");

  await Product.updateMany(
    { brand: brandId },
    { $set: { isBlocked: false } }
  );

  return true;
};

export default {
  getBrands,
  createBrand,
  updateBrand,
  blockBrand,
  restoreBrandById
};