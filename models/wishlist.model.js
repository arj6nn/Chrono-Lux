import mongoose from "mongoose";
const { Schema } = mongoose;

const wishlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product"
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Wishlist", wishlistSchema);
