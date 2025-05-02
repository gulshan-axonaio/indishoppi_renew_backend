const { Schema, model } = require("mongoose");

const savelistSchema = new Schema(
  {
    userId: {
      type: Schema.ObjectId,
      required: true,
    },
    productId: {
      type: Schema.ObjectId,
      required: true,
    },
    variantId: {
      type: Schema.ObjectId,
      required: true,
      ref: "variants",
    },
    quantity: {
      type: Number,
      required: true,
    },
    size: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("savelist", savelistSchema);
