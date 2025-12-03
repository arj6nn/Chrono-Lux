const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true   // Removes extra spaces
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    isListed: {
        type: Boolean,
        default: true   // Category visible by default
    },

    categoryOffer: {
        type: Number,
        default: 0,
        min: 0,
        max: 100        // Percentage offer limit
    }

}, { timestamps: true });  // Auto creates createdAt & updatedAt fields

module.exports = mongoose.model("Category", categorySchema);
