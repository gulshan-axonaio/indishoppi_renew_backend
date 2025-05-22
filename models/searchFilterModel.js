const { Schema, model } = require("mongoose");

const searchfilterSchema = new Schema({
  productType: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  options: [{ type: String }],
});

module.exports = model("searchFilter", searchfilterSchema);
