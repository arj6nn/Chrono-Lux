const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
    name : {
        type : String,
        required : true,
        unique : true,
        uppercase : true,
        trim : true
    },
    offerPrice : {
        type : Number,
        required : true,
        min : 0
    },
    minimumPrice : {
        type :Number,
        required : true,
        min : 0
    },
    isListed : {
        type : Boolean,
        default : true
    },
    userId : [{
        type : Schema.Types.ObjectId,
        ref:"User"
    }],
    expireOn : {
        type : Date,
        required : true
    }
},{ timestamps: true });

const Coupon = mongoose.model("Coupon",couponSchema);
module.exports = Coupon;
