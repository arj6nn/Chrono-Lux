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
            type: String,     // Cloudinary URL
            required: true
        },

        // NEW FIELD → Used for toggle button (Active / Inactive)
        isListed: {
            type: Boolean,
            default: true
        },

        // Soft delete (You will NOT delete permanently)
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
