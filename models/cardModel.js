const { Schema, model } = require("mongoose");

const cardSchema = new Schema(
  {
    userId: {
      type: Schema.ObjectId,
      required: true,
    },
    productId: {
      type: Schema.ObjectId,
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "sellers",
    },
    variantId: {
      type: Schema.ObjectId,
      ref: "variants",
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
    },
    size: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = model("cardProducts", cardSchema);
