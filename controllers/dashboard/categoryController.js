const categoryModel = require("../../models/categoryModel");
const { responseReturn } = require("../../utiles/response");
const cloudinary = require("cloudinary").v2;
const sharp = require("sharp");
const formidable = require("formidable");
const subCategory = require("../../models/subCategory");
const mongoose = require("mongoose");
const FeaturedCategorys = require("../../models/FeaturedCategorys");
const filteroption = require("../../models/filteroptionModel");
const createDynamicProductSchema = require("../../models/productModel");
let productModel = null;

const initProductModel = async () => {
  productModel = await createDynamicProductSchema();
};
initProductModel();
class categoryController {
  add_category = async (req, res) => {
    const { name, image } = req.body;
    if (!name || !image) {
      return responseReturn(res, 400, { message: "All fields are required" });
    }

    try {
      const pname = name.trim();
      const slug = pname
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-");

      const category = await categoryModel.create({
        name,
        slug,
        image,
      });

      responseReturn(res, 201, {
        category,
        message: "Category added successfully",
      });
    } catch (error) {
      console.log(error, "error");
      responseReturn(res, 500, { error: error.message });
    }
  };

  get_category = async (req, res) => {
    const { page, searchValue, parPage } = req.query;
    try {
      let skipPage = "";
      if (parPage && page) {
        skipPage = parseInt(parPage) * (parseInt(page) - 1);
      }
      if (searchValue && page && parPage) {
        const categorys = await categoryModel
          .find({
            $text: { $search: searchValue },
          })
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalCategory = await categoryModel
          .find({
            $text: { $search: searchValue },
          })
          .countDocuments();
        responseReturn(res, 200, { totalCategory, categorys });
      } else if (searchValue === "" && page && parPage) {
        const categorys = await categoryModel
          .find({})
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalCategory = await categoryModel.find({}).countDocuments();
        responseReturn(res, 200, { totalCategory, categorys });
      } else {
        const categorys = await categoryModel.find({}).sort({ createdAt: -1 });
        const totalCategory = await categoryModel.find({}).countDocuments();
        responseReturn(res, 200, { totalCategory, categorys });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  get_productype = async (req, res) => {
    try {
      const productypes = await filteroption.find().select("_id productType");

      console.log("productType", productypes);

      responseReturn(res, 200, { productypes });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_one_category = async (req, res) => {
    const { categoryId } = req.params;

    try {
      const category = await categoryModel.findById(categoryId);
      responseReturn(res, 200, { category });
    } catch (error) {
      console.log(error.message);
    }
  };

  //delete category
  delete_category = async (req, res) => {
    const { categoryId } = req.params;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const category = await categoryModel.findByIdAndDelete(categoryId, {
        session,
      });
      if (!category) {
        throw new Error("Category not found");
      }

      const subcategoryList = await subCategory.find({ categoryId });
      const subcategories = await subCategory.deleteMany(
        { categoryId },
        { session }
      );
      console.log(subcategoryList);
      console.log("firedd.....");
      const productDeletion = await productModel.deleteMany(
        {
          $or: [
            { category: category.name },
            { subcategory: { $in: subcategoryList.map((sub) => sub.name) } },
          ],
        },
        { session }
      );

      console.log(productDeletion);

      console.log("fireddd.. 2");

      await session.commitTransaction();
      session.endSession();

      responseReturn(res, 200, {
        message: "Category deleted successfully",
        categoryId,
      });
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 500, { message: error.message });
    }
  };

  category_update = async (req, res) => {
    const { name, image, categoryId } = req.body;

    if (!categoryId || !name) {
      return responseReturn(res, 400, { message: "All fields are required" });
    }

    const pname = name.trim();
    const slug = pname
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
    try {
      await categoryModel.findByIdAndUpdate(categoryId, {
        categoryId,
        name,
        slug,
        image,
      });

      const category = await categoryModel.findById(categoryId);
      responseReturn(res, 200, {
        category,
        message: "category update success",
      });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };
  category_image_update = async (req, res) => {
    const form = formidable({ multiples: true });

    form.parse(req, async (err, field, files) => {
      const { categoryId, oldImage } = field;
      const { newImage } = files;

      if (err) {
        responseReturn(res, 404, { error: err.message });
      } else {
        try {
          const result = await cloudinary.uploader.upload(newImage.filepath, {
            folder: "categorys",
          });
          if (result) {
            let { images } = await categoryModel.findById(categoryId);
            const index = images.findIndex((img) => img === oldImage);
            images[index] = result.url;

            await categoryModel.findByIdAndUpdate(categoryId, {
              images,
            });

            const category = await categoryModel.findById(categoryId);
            responseReturn(res, 200, {
              category,
              message: "category image update success",
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

  /**
   *
   *            FEATURED CATEGORYS
   *
   */

  add_featured_category = async (req, res) => {
    const form = formidable();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        responseReturn(res, 404, { error: "something error" });
      } else {
        let { name, catslug } = fields;
        let { image } = files;
        name = name.trim();

        const slug = name.split(" ").join("-");

        try {
          // Define the transformation parameters for cropping
          const cropParams = {
            width: 300,
            height: 300,
            crop: "crop", // Use 'crop' to perform cropping
            gravity: "auto", // Use 'auto' to automatically detect the most relevant region
          };
          // Upload the cropped image to Cloudinary
          const result = await cloudinary.uploader.upload(image.filepath, {
            folder: "categorys",
            resource_type: "image",
            transformation: cropParams,
          });
          // console.log(result, "result");
          if (result) {
            const category = await FeaturedCategorys.create({
              name,
              slug,
              categorys: [catslug],
              image: result.url,
            });
            responseReturn(res, 201, {
              category,
              message: "category add success",
            });
          } else {
            responseReturn(res, 404, { error: "Image upload failed" });
          }
        } catch (error) {
          console.log(error);
          responseReturn(res, 500, { error: "Internal server error" });
        }
      }
    });
  };

  add_cats_to_featured_category = async (req, res) => {
    const { featuredId } = req.params;
    const { slug } = req.body;

    if (!slug || !featuredId) {
      responseReturn(res, 400, { message: "please provide all the details" });
    }
    try {
      const addedCats = await FeaturedCategorys.findOneAndUpdate(
        { _id: featuredId },
        {
          $addToSet: { categorys: slug },
        },
        { new: true }
      );

      if (!addedCats) {
        responseReturn(res, 400, { message: "failed to append category" });
      }
      responseReturn(res, 200, { message: " category added successfully" });
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 400, { message: "operation failed " });
    }
  };
  get_featured_category = async (req, res) => {
    try {
      const { slug } = req.params;
      const featuredSubcats = await FeaturedCategorys.aggregate([
        {
          $match: { slug }, // Match the featuredCategory by slug
        },
        {
          $lookup: {
            from: "categorys", // Name of the categories collection
            localField: "categorys", // Field in featuredCategorys schema
            foreignField: "name", // Field in categories schema
            as: "categories", // Output field
          },
        },
        {
          $unwind: "$categories", // Unwind categories array
        },
        {
          $lookup: {
            from: "subcategories", // Name of the subcategories collection
            localField: "categories._id", // Reference categories by ID
            foreignField: "categoryId", // Subcategories field linking to categories
            as: "categories.subcategories", // Output field in categories
          },
        },
        {
          $group: {
            _id: "$categories._id",
            categoryName: { $first: "$categories.name" },
            subcategories: {
              $push: "$categories.subcategories", // Push subcategories directly
            },
          },
        },
        {
          $project: {
            _id: 1, // Exclude the MongoDB _id field
            categoryName: 1,

            subcategories: {
              $reduce: {
                input: "$subcategories",
                initialValue: [],
                in: {
                  $concatArrays: [
                    "$$value",
                    {
                      $map: {
                        input: "$$this",
                        as: "subcat",
                        in: {
                          productType: "$$subcat.productType",
                          name: "$$subcat.name",
                          image: "$$subcat.image",
                          slug: "$$subcat.slug",
                          _id: "$$subcat._id",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]);

      responseReturn(res, 200, {
        data: featuredSubcats,
        message: "items fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_featured_categorys = async (req, res) => {
    try {
      const featuredCategorys = await FeaturedCategorys.find().select(
        "name slug image  "
      );
      responseReturn(res, 200, {
        data: featuredCategorys,
        message: "items fetched successfully",
        status: 200,
      });
    } catch (error) {
      responseReturn(res, 400, { error: error.message });

      console.log(error.message);
    }
  };

  new_category_list = async (req, res) => {
    try {
      const category = await categoryModel.find(
        {},
        { _id: 1, name: 1, image: 1, slug: 1 }
      );
      responseReturn(res, 200, {
        data: category,
        message: "fetch successfully",
        status: 200,
      });
    } catch (error) {
      responseReturn(res, 400, { error: error.message });
      console.log(error.message);
    }
  };

  new_getsubcategoryByCategory = async (req, res) => {
    const { categoryId } = req.body;
    try {
      const category = await categoryModel.findById(categoryId).lean();
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      const subCategoryIds = category.subcategories;

      const subCategories = await subCategory
        .find(
          { _id: { $in: subCategoryIds } },
          {
            _id: 1,
            name: 1,
            categoryName: 1,
            image: 1,
            slug: 1,
            productType: 1,
          }
        )
        .lean();

      const resData = [
        {
          categoryId: categoryId,
          categoryName: category.name,
          subcategories: subCategories,
        },
      ];

      responseReturn(res, 200, {
        data: resData,
        message: "fetch successfully",
        status: 200,
      });
    } catch (error) {
      responseReturn(res, 400, { error: error.message });
      console.log(error.message);
    }
  };

  get_filter_option_new = async (req, res) => {
    try {
      const productTypesRes = await filteroption.find();
      responseReturn(res, 200, { productTypesRes });
    } catch (error) {
      responseReturn(res, 200, { message: "Internal server error." });
      console.log(error.message);
    }
  };
}

module.exports = new categoryController();
