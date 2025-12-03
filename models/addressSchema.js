const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    address: [{
        addressType: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        landMark: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            trim: true
        },
        pincode: {
            type: String, // Changed from Number to String to handle leading zeros
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        altPhone: {       // Added field: Useful for delivery agents
            type: String,
            trim: true
        }
    }]
})

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;