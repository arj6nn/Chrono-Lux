import mongoose from "mongoose";
const { Schema } = mongoose;

const couponSchema = new Schema(
    {
        couponCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        },

        discountType: {
            type: String,
            enum: ["PERCENTAGE", "FLAT"],
            required: true
        },

        discountValue: {
            type: Number,
            required: true,
            min: 1
        },

        minimumPurchaseAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        totalUsageLimit: {
            type: Number,
            default: 0 // 0 = unlimited
        },

        usedCount: {
            type: Number,
            default: 0
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

        usedBy: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    { timestamps: true }
);

export default mongoose.model("Coupon", couponSchema);