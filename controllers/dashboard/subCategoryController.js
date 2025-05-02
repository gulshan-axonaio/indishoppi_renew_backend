const subCategoryModel = require("../../models/subCategory");
const categoryModel = require("../../models/categoryModel");
const { responseReturn } = require("../../utiles/response");
const cloudinary = require("cloudinary").v2;
const formidable = require("formidable");
const { Types } = require("mongoose");

const createDynamicProductSchema = require("../../models/productModel");
let productModel = null;

const initProductModel = async () => {
  productModel = await createDynamicProductSchema();
};
initProductModel();

class subCategoryController {
  add_sub_category = async (req, res) => {
    const { name, categoryId, image, productType } = req.body;

    if (!name || !categoryId || !image || !productType) {
      return responseReturn(res, 400, { message: "All fields are required" });
    }
    const pname = name.trim();
    const slug = pname
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");

    try {
      const getCategoryName = await categoryModel.findById(categoryId);
      const categoryName = getCategoryName.name;
      if (image) {
        const subCategory = await subCategoryModel.create({
          name,
          categoryName,
          categoryId,
          slug,
          image,
          productType,
        });

        await subCategory.save();
        const category = await categoryModel.findOne({ _id: categoryId });
        category.subcategories.push(subCategory._id);
        await category.save();

        responseReturn(res, 201, {
          subCategory,
          message: "Subcategory add success",
        });
      } else {
        responseReturn(res, 404, { error: "Image upload failed" });
      }
    } catch (error) {
      console.log(error);
      responseReturn(res, 500, {
        error: "Internal zeryghzndsbfegWdserver error",
      });
    }
  };

  get_sub_category = async (req, res) => {
    const { page, searchValue, parPage } = req.query;
    try {
      let skipPage = "";
      if (parPage && page) {
        skipPage = parseInt(parPage) * (parseInt(page) - 1);
      }
      if (searchValue && page && parPage) {
        const subCategorys = await subCategoryModel
          .find({
            $text: { $search: searchValue },
          })
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalSubCategory = await subCategoryModel
          .find({
            $text: { $search: searchValue },
          })
          .countDocuments();
        responseReturn(res, 200, { totalSubCategory, subCategorys });
      } else if (searchValue === "" && page && parPage) {
        const subCategorys = await subCategoryModel
          .find({})
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalSubCategory = await subCategoryModel
          .find({})
          .countDocuments();
        responseReturn(res, 200, { totalSubCategory, subCategorys });
      } else {
        const subCategorys = await subCategoryModel
          .find({})
          .sort({ createdAt: -1 });
        const totalSubCategory = await subCategoryModel
          .find({})
          .countDocuments();
        responseReturn(res, 200, { totalSubCategory, subCategorys });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  get_one_sub_category = async (req, res) => {
    const { subCategoryId } = req.params;

    try {
      const subCategory = await subCategoryId.findById(subCategoryId);
      responseReturn(res, 200, { subCategory });
    } catch (error) {
      console.log(error.message);
    }
  };

  //delete category
  delete_sub_category = async (req, res) => {
    const { subCategoryId } = req.params;
    try {
      const subcategory = await subCategoryModel.findByIdAndDelete(
        subCategoryId
      );
      if (subcategory) {
        const productDeletion = await productModel.deleteMany(
          // Products directly in the category
          { subcategory: subcategory.name }
        );
      }
      responseReturn(res, 200, {
        message: "Sub Category deleted successfully",
        subCategoryId,
      });
    } catch (error) {
      responseReturn(res, 500, { message: error.message });
    }
  };

  sub_category_update = async (req, res) => {
    let { name, image, categoryId, subCategoryId, productType } = req.body;

    const pname = name.trim();
    const slug = pname
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
    try {
      let updateData = {
        name,
        image,
        categoryId,
        slug,
        productType,
      };

      const updatedSubCategory = await subCategoryModel.findByIdAndUpdate(
        subCategoryId,
        updateData,
        { new: true }
      );

      responseReturn(res, 200, {
        updatedSubCategory,
        message: "sub category update success",
      });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  sub_category_image_update = async (req, res) => {
    const form = formidable({ multiples: true });

    form.parse(req, async (err, field, files) => {
      const { subCategoryId, oldImage } = field;
      const { newImage } = files;

      if (err) {
        responseReturn(res, 404, { error: err.message });
      } else {
        try {
          cloudinary.config({
            cloud_name: process.env.cloud_name,
            api_key: process.env.api_key,
            api_secret: process.env.api_secret,
            secure: true,
          });
          const result = await cloudinary.uploader.upload(newImage.filepath, {
            folder: "subcategory",
          });
          if (result) {
            let { images } = await subCategoryModel.findById(subCategoryId);
            const index = images.findIndex((img) => img === oldImage);
            images[index] = result.url;

            await subCategoryModel.findByIdAndUpdate(subCategoryId, {
              images,
            });

            const subCategory = await subCategoryModel.findById(subCategoryId);
            responseReturn(res, 200, {
              subCategory,
              message: "sub category image update success",
            });
          } else {
            responseReturn(res, 404, { error: "image upload failed" });
          }
        } catch (error) {
          responseReturn(res, 404, { error: error.message });
        }
      }
    });
  };

  get_sub_cat_by_category = async (req, res) => {
    const { categoryId } = req.params;

    try {
      const subCategorys = await categoryModel.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(categoryId),
          },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "subcategories",
            foreignField: "_id",
            as: "subcategoriesDetails",
          },
        },

        {
          $unwind: "$subcategoriesDetails",
        },
        {
          $replaceRoot: {
            newRoot: "$subcategoriesDetails",
          },
        },
        {
          $project: {
            _id: 1,
            categoryId: 1,
            name: 1,
            categoryName: 1,
            slug: 1,
            image: 1,
            productType: 1,
          },
        },
      ]);

      if (subCategorys) {
        responseReturn(res, 200, {
          specificSubCategory: subCategorys,
          status: 200,
          message: "data fetched ",
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
}

module.exports = new subCategoryController();
