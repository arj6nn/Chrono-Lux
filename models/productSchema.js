const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      required: true,
      trim: true,
    },
    dialSize: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },

    // array of Cloudinary URLs
    images: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v.length > 0;  // at least 1 image
        },
        message: "Each variant must have at least one image",
      },
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // category ref
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    // brand ref
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    // array of variant objects
    variants: {
      type: [variantSchema],
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "Product must contain at least one variant",
      },
    },

    // soft delete / block
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
