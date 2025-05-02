const { Schema, model } = require("mongoose");

const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phonenumber: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      // required: true,
      // select: false,
    },
    address: {
      type: String,
    },
    avatar: { type: String },
    role: {
      type: String,
      default: "seller",
    },
    method: {
      type: String,
      required: true,
    },
    isRegistered: {
      type: Boolean,
      default: false,
    },
    deviceId: {
      type: String,
      default: "",
    },
    otp: {
      type: String,
      required: false,
    },
    otpExpiry: {
      type: Date,
      required: false,
    },
    passResetOtp: {
      type: String,
      required: false,
    },
    passResetOtpExpiry: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = model("customers", customerSchema);
