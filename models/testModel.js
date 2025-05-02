const { Schema, model } = require("mongoose");

const testOrder = new Schema(
  {
    sellerId: [
      {
        type: Schema.Types.ObjectId,
        ref: "sellers",
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("testOrders", testOrder);
