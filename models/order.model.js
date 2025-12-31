const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4:uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId : {
        type : String,
        default : () => uuidv4(),
        unique : true
    },
    userId : {
        type : Schema.Types.ObjectId,
        ref:"User",
        required : true
    },
    orderedItems : [{
        product : {
            type : Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity : {
            type : Number,
            required : true
        },
        price : {
            type:Number,
            default : 0
        }
    }],
    totalPrice:{
        type : Number,
        required : true
    },
    discount : {
        type : Number,
        default : 0 
    },
    finalAmount : {
        type : Number,
        required : true
    },
    address : {
        name : { type: String, required: true },
        city : { type: String, required: true },
        landMark : { type: String, required: true },
        state : { type: String, required: true },
        pincode : { type: String, required: true },
        phone : { type: String, required: true }
    },
    invoiceDate : {
        type : Date,
    },
    status : {
        type : String,
        required : true,
        enum : ["Pending","Processing","Shipped","Delivered","Cancelled","Return Request","Returned"]
    },
    couponApplied : {
        type : Boolean,
        default : false
    },
    paymentMethod : {
        type : String,
        default : 'Razorpay'
    },
    paymentStatus : {
        type: String,
        enum : ['Pending','Paid','Failed','Refunded'],
        default : 'Pending'
    }
},{timestamps:true});

const Order = mongoose.model("Order",orderSchema);
module.exports = Order;