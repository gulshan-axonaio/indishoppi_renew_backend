const { Schema, model } = require("mongoose");

const customerOrder = new Schema(
  {
    customerId: {
      type: Schema.ObjectId,
      required: true,
    },
    products: {
      type: Array,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    payment_status: {
      type: String,
      required: true,
    },
    shippingInfo: {
      type: Object,
      required: true,
    },
    orderId: { type: String },
    delivery_status: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
    },
    date: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = model("customerOrders", customerOrder);
