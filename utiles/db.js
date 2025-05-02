const mongoose = require("mongoose");
const productModel = require("../models/productModel");
const recentSearch = require("../models/recentSearch");

module.exports.dbConnect = async () => {
  try {
    await mongoose
      .connect(process.env.DB_URL, { dbName: "indishoppe" })
      .then(() => console.log("database connected....", process.env.DB_URL));
  } catch (error) {
    console.log(error.message);
  }
};
