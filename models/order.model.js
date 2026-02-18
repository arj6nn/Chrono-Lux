import mongoose from "mongoose";
const { Schema } = mongoose;

function generateOrderId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CLX-${date}-${random}`;
}

const orderSchema = new Schema(
  {
    orderId: {
      type: String,
      unique: true,
      index: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    orderedItems: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },

        variantId: {
          type: Schema.Types.ObjectId
        },

        quantity: {
          type: Number,
          required: true,
          min: 1
        },

        price: {
          type: Number,
          required: true
        },

        mrp: {
          type: Number,
          required: true
        },

        appliedOffer: {
          name: String,
          discountValue: Number,
          offerType: String
        },

        status: {
          type: String,
          enum: [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Cancellation Requested",
            "Returned",
            "Refunded"
          ],
          default: "Pending"
        },

        cancelReason: {
          type: String,
          default: ""
        },

        cancelledAt: {
          type: Date
        },

        returnRequested: {
          type: Boolean,
          default: false
        },

        returnReason: {
          type: String,
          default: ""
        },

        returnStatus: {
          type: String,
          enum: ["Requested", "Approved", "Rejected", "Refunded"],
          default: null
        },

        returnRequestedAt: {
          type: Date
        },

        isReturned: {
          type: Boolean,
          default: false
        }
      }
    ],

    totalPrice: {
      type: Number,
      required: true
    },

    discount: {
      type: Number,
      default: 0
    },

    finalAmount: {
      type: Number,
      required: true
    },

    address: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true }
    },
    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Partially Refunded",
        "Partially Delivered",
        "Return Requested",
        "Cancellation Requested",
        "Refunded",
        "Cancelled"
      ],
      default: "Pending"
    },

    couponApplied: {
      type: Boolean,
      default: false
    },
    couponCode: {
      type: String,
      default: ""
    },
    couponDiscount: {
      type: Number,
      default: 0
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "RAZORPAY", "WALLET"],
      required: true
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending"
    },

    paymentDetails: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String }
    },


    refundAmount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

orderSchema.pre("save", function () {
  if (!this.orderId) {
    this.orderId = generateOrderId();
  }
});


export default mongoose.model("Order", orderSchema);