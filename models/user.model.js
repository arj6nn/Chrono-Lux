import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        required: false,  // Must be false so Google Login works
        unique: false,    // No need for sparse since unique is false
        default: null,
        sparse: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: null
    },
    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart",
    }],
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: "Wishlist"
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    referalCode: {
        type: String
    },
    referredByCode: {
        type: String,
        default: null
    },
    redeemed: {
        type: Boolean,
        default: false
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        brand: {
            type: String
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]
},
    { timestamps: true }
)

const User = mongoose.model("User", userSchema)

export default User;