const { Schema, model, default: mongoose } = require("mongoose");

const customerAddress = new Schema(
  {
    name: {
      type: String,
    },
    phonenumber: {
      type: Number,
      required: true,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
      required: true,
    },
    housenumber: {
      type: String,
    },
    area: {
      type: String,
      required: true,
    },

    typeOfAddress: {
      type: String,
      enum: ["Home", "Work", "Other"],
    },
    pincode: {
      type: String,
    },
    defaultAddress: {
      type: Boolean,
      required: false,
    },
    landmark: {
      type: String,
    },
    district: {
      type: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "customers",
    },
  },
  { timestamps: true }
);

module.exports = model("customerAddress", customerAddress);
