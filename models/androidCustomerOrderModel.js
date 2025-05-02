const { Schema, model } = require("mongoose");

const customerOrder = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "customers",
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "sellers",
    },
    orderId: {
      type: Schema.Types.ObjectId,
    },
    channel_order_id: {
      type: Schema.Types.ObjectId,
      default: "",
    },
    srOrderId: {
      type: String,
      default: "",
    },
    shipment_id: {
      type: String,
      default: "",
    },
    selectedSize: { type: String },
    couponDiscount: { type: Number },
    products: {
      type: Array,
      // required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discountedPrice: {
      type: Number,
    },
    discount: {
      type: Number,
    },

    payment_details: {
      method: {
        enum: ["upi", "cod", "netbanking", null],
        type: String,
        default: null,
      },
    },
    shippingInfo: {
      type: Object,
      required: true,
    },
    appliedCoupon: {
      type: String,
      required: false,
    },
    isShiped: {
      type: String,
      required: true,
      default: "pending",
    },
    payment_status: {
      enum: ["unpaid", "pending", "paid", "failed"],
      type: String,
      default: "unpaid",
    },
    order_status: {
      enum: [
        "pending",
        "placed",
        "dispatched",
        "cancelled",
        "warehouse",
        "out for delivery",
        "delivered",
      ],
      type: String,
      default: "pending",
      required: false,
    },

    return_status: {
      default: null,
      type: String,
      enum: ["cancelled", "started", "processing", "refunded", null],
    },
    return_details: {
      initiate_date: { type: Date, default: Date.now },
      cancelled_date: {
        type: Date,
      },
      refund_date: {
        type: Date,
      },
      bank_details: {
        acc: String,
        ifsc: String,
        upiId: String,
        accHolderName: String,
        referenceNumber: String,
      },
    },
    transactionId: {
      type: String,
    },
    transactionDate: {
      type: String,
    },
    return_eligible_till: {
      type: String,
      default: "7 days",
    },
  },
  { timestamps: true }
);

module.exports = model("androidCustomerOrders", customerOrder);
