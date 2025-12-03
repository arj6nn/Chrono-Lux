const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },                     // ✔️ Product name
    description: { type: String, required: true },              // ✔️ Description

    images: { type: [String], required: true },                 // ✔️ Multiple Cloudinary URLs
                                                                // ✔️ Minimum 3 will be enforced in controller

    price: { type: Number, required: true },                    // ✔️ Original price
    offerPrice: { type: Number },                               // ✔️ Optional discount price

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, // ✔️ Category relation
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },        // ✔️ Brand relation

    gender: { type: String, enum: ["Men", "Women", "Unisex"], required: true },           // ✔️ Gender filter
    type: { type: String, enum: ["Automatic", "Quartz", "Mechanical", "Chronograph"], required: true }, // ✔️ Watch type

    stock: { type: Number, required: true },                        // ✔️ Inventory count

    isBlocked: { type: Boolean, default: false },                   // ✔️ Block product instead of deleting
    isDeleted: { type: Boolean, default: false },                   // ✔️ Soft delete

    createdAt: { type: Date, default: Date.now }
});


const Product = mongoose.model("Product", productSchema);

module.exports = Product;