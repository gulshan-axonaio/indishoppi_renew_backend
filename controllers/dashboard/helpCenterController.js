const faqCategoryModel = require("../../models/faqCategoryModel");
const faqSubcategoryModel = require("../../models/faqSubcategoryModel");
const { responseReturn } = require("../../utiles/response");
const mongoose = require("mongoose");

class helpCenterController {
  faq_category_add = async (req, res) => {
    const { title, subtitle } = req.body;
    if (!title || !subtitle) {
      responseReturn(res, 500, { message: "all fiels required." });
    }

    const response = await faqCategoryModel.create({
      title,
      subtitle,
    });

    try {
      responseReturn(res, 201, {
        status: 200,
        data: response,
        message: "added successfully",
      });
    } catch (error) {
      console.log(error, "error");
      responseReturn(res, 500, { error: error.message });
    }
  };

  customer_get_faq_category = async (req, res) => {
    try {
      const response = await faqCategoryModel
        .find()
        .select("_id title subtitle");
      responseReturn(res, 201, {
        status: 200,
        data: response,
        message: "get successfully",
      });
    } catch (error) {
      console.log(error, "error");
      responseReturn(res, 500, { error: error.message });
    }
  };

  //   faq subcategory

  faq_subcategory_add = async (req, res) => {
    const { categoryId, title, description } = req.body;
    if (!categoryId || !title || !description) {
      responseReturn(res, 500, { message: "all fiels required." });
    }
    const isExist = await faqCategoryModel.findOne({ _id: categoryId });
    if (!isExist) {
      responseReturn(res, 500, { message: "This category not fond." });
    }

    const response = await faqSubcategoryModel.create({
      categoryId: new mongoose.Types.ObjectId(categoryId),
      title,
      description,
    });

    try {
      responseReturn(res, 201, {
        status: 200,
        data: response,
        message: "added successfully",
      });
    } catch (error) {
      console.log(error, "error");
      responseReturn(res, 500, { error: error.message });
    }
  };

  customer_get_faq_subcategory_bycategory = async (req, res) => {
    const { categoryId } = req.body;
    if (!categoryId) {
      responseReturn(res, 500, { message: "categoryId required." });
    }
    const isExist = await faqCategoryModel.findOne({ _id: categoryId });
    if (!isExist) {
      responseReturn(res, 500, { message: "This category not fond." });
    }

    try {
      const faqSubcategories = await faqSubcategoryModel
        .find({
          categoryId: categoryId,
        })
        .select("categoryId title description");

      responseReturn(res, 201, {
        status: 200,
        data: faqSubcategories,
        message: "get successfully",
      });
    } catch (error) {
      console.log(error, "error");
      responseReturn(res, 500, { error: error.message });
    }
  };
}

module.exports = new helpCenterController();
