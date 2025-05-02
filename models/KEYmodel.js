const { Schema, model } = require("mongoose");

const keySchema = new Schema(
  {
    clientId: {
      type: String,
      required: true,
    },
    apiSECRETkey: {
      type: String,
      required: true,
    },
    apiSALTkey: {
      type: String,
      required: true,
    },
    apiAESkey: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = model("KEY", keySchema);
