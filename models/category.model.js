import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        categoryImage: {
            type: String,     // cloudinary URL
            required: true
        },

        isListed: {
            type: Boolean,
            default: true
        },

        isBlocked: {
            type: Boolean,
            default: false
        },

        categoryOffer: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },
    { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
