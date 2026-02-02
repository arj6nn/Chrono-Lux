import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["PRODUCT", "CATEGORY"],
      required: true
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE"],
      default: "PERCENTAGE"
    },

    discountValue: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ],

    applicableCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
    }
  },
  { timestamps: true }
);

/* ======================
   VALIDATION (SAFE)
====================== */
offerSchema.pre("save", function () {
  if (this.startDate >= this.endDate) {
    throw new Error("Start date must be before end date");
  }
});

export default mongoose.model("Offer", offerSchema);
