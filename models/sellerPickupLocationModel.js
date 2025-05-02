const { Schema, model } = require("mongoose");

const sellerPickupLocation = new Schema(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "sellers",
      default: null,
    },
    company_id: {
      type: Number,
      default: "",
    },
    pickup_id: {
      type: Number,
      default: "",
    },
    company_name: {
      type: String,
      default: "",
    },
    pickup_location: {
      type: String,
      default: "",
    },
    full_name: {
      type: String,
      default: "",
    },
    pickup_code: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      required: true,
      default: "",
    },
    address_2: {
      type: String,
      default: "",
    },
    address_type: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      required: true,
      default: "",
    },
    state: {
      type: String,
      required: true,
      default: "",
    },
    country: {
      type: String,
      required: true,
      default: "",
    },
    gstin: {
      type: String,
      default: "",
    },
    pin_code: {
      type: String,
      required: true,
      default: "",
    },
    phone: {
      type: String,
      required: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      default: "",
    },
    name: {
      type: String,
      required: true,
      default: "",
    },
    alternate_phone: {
      type: String,
      default: "",
    },
    lat: {
      type: Number,
      default: "",
    },
    long: {
      type: Number,
      default: "",
    },
    status: {
      type: Number,
      default: 0,
    },
    phone_verified: {
      type: Number,
      default: 0,
    },
    rto_address_id: {
      type: Number,
      default: "",
    },
    extra_info: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = model("sellerPickupLocations", sellerPickupLocation);
