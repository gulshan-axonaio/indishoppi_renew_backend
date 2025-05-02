const mongoose = require("mongoose");

const filterOptionsSchema = new mongoose.Schema({
  productType: {
    type: String,
    required: true,
    unique: true,
  },
  options: [{ type: String }],
});

module.exports = mongoose.model("Filter-options", filterOptionsSchema);
