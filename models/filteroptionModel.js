const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  section: { type: String, required: true },
});

const filterOptionsSchema = new mongoose.Schema({
  productType: {
    type: String,
    required: true,
    unique: true,
  },
  options: [optionSchema],
});

module.exports = mongoose.model("Filter-options", filterOptionsSchema);
