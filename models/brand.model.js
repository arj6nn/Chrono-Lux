// models/brandSchema.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const brandSchema = new Schema({
    brandName: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },

    brandImage: {
        type: [String],   // array of Cloudinary URLs or local URLs
        required: true,
    },

    isBlocked: {
        type: Boolean,
        default: false,
    },

    deletedAt: {
        type: Date,
        default: null,
    }
},{ timestamps: true });

const Brand = mongoose.model("Brand", brandSchema);
module.exports = Brand;
