const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    unique: false,
  },
  type: {
    type: String,
    enum: ["price", "discount"], // "price" = flat discount, "discount" = percentage
    required: true,
  },
  value: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) {
        return this.type === "price" ? v > 0 : v > 0 && v <= 100; // Discount percentage must be <= 100
      },
      message: (props) => `Invalid value for type "${props.instance.type}"`,
    },
  },
  upto: {
    type: Number,
    required: false,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Coupon", couponSchema);
