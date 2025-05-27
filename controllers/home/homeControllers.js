const categoryModel = require("../../models/categoryModel");
const subCategoryModel = require("../../models/subCategory");
const androidCustomerOrderModel = require("../../models/androidCustomerOrderModel");
const queryProducts = require("../../utiles/queryProducts");
const reviewModel = require("../../models/reviewModel");
const customerModel = require("../../models/customerModel");
const mongoose = require("mongoose");
const moment = require("moment");
const Fuse = require("fuse.js");
const {
  mongo: { ObjectId },
} = require("mongoose");

const { responseReturn } = require("../../utiles/response");
const bannerModel = require("../../models/bannerModel");
const subCategory = require("../../models/subCategory");
const recentSearch = require("../../models/recentSearch");
const filteroptionModel = require("../../models/filteroptionModel");
const createDynamicProductSchema = require("../../models/productModel");
const createDynamicVariantSchema = require("../../models/productDetailsModel");
let productModel = null;
let ProductDetailsModel = null;

const initProductModel = async () => {
  productModel = await createDynamicProductSchema();
  ProductDetailsModel = await createDynamicVariantSchema();
};
initProductModel();
class homeControllers {
  formateProduct = (products) => {
    const productArray = [];
    let i = 0;
    while (i < products.length) {
      let temp = [];
      let j = i;
      while (j < i + 3) {
        if (products[j]) {
          temp.push(products[j]);
        }
        j++;
      }
      productArray.push([...temp]);
      i = j;
    }
    return productArray;
  };
  get_categorys = async (req, res) => {
    try {
      const categorys = await categoryModel.find({});
      responseReturn(res, 200, {
        categorys,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  home_page_product_listing = async (req, res) => {
    try {
      const categories = await categoryModel.find({}, { name: 1, _id: 0 });

      const categoryNames = categories.map((cat) => cat.name);

      const products = await productModel.find({
        category: { $in: categoryNames },
      });

      let categorizedProducts = {};

      categoryNames.forEach((category) => {
        categorizedProducts[category] = [];
      });

      products.forEach((product) => {
        if (categorizedProducts[product.category]) {
          categorizedProducts[product.category].push(product);
        }
      });

      let responseData = Object.keys(categorizedProducts).map((category) => ({
        title: category,
        products: categorizedProducts[category],
      }));

      return res.status(200).json({
        message: "Sale products fetched successfully",
        status: 200,
        gkProducts: responseData,
      });
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({
        message: "Internal server error",
        status: 500,
      });
    }
  };

  get_products = async (req, res) => {
    try {
      const products = await productModel.find({}).limit(16).sort({
        createdAt: -1,
      });
      const allProduct1 = await productModel.find({}).limit(9).sort({
        createdAt: -1,
      });
      const latest_product = this.formateProduct(allProduct1);
      const allProduct2 = await productModel.find({}).limit(9).sort({
        rating: -1,
      });
      const topRated_product = this.formateProduct(allProduct2);
      const allProduct3 = await productModel.find({}).limit(9).sort({
        discount: -1,
      });
      const discount_product = this.formateProduct(allProduct3);

      responseReturn(res, 200, {
        products,
        latest_product,
        topRated_product,
        discount_product,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_product = async (req, res) => {
    const { slug } = req.params;
    try {
      const product = await productModel.findOne({
        slug,
      });

      const relatedProducts = await productModel.aggregate([
        {
          $match: {
            $and: [
              {
                _id: {
                  $ne: product._id,
                },
              },
              {
                category: {
                  $eq: product.category,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            category: 1,
            rating: 1,
            subcategory: 1,
            brand: 1,
            price: 1,
            discount: 1,
            stock: 1,
            description: 1,
            // Use $arrayElemAt to get the first image
            images: 1,
          },
        },
      ]);

      const moreProducts = await productModel.aggregate([
        {
          $match: {
            $and: [
              {
                _id: {
                  $ne: product._id,
                },
              },
              {
                sellerId: {
                  $eq: product.sellerId,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            category: 1,
            rating: 1,
            subcategory: 1,
            brand: 1,
            price: 1,
            discount: 1,
            stock: 1,
            description: 1,
            // Use $arrayElemAt to get the first image
            images: 1,
          },
        },
      ]);
      responseReturn(res, 200, {
        product,
        relatedProducts,
        moreProducts,
        message: "details fetched successfully ",
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  price_range_product = async (req, res) => {
    try {
      const priceRange = {
        low: 0,
        high: 100,
      };
      const products = await productModel.find({}).limit(9).sort({
        createdAt: -1,
      });
      const latest_product = this.formateProduct(products);
      const getForPrice = await productModel.find({}).sort({
        price: 1,
      });
      if (getForPrice.length > 0) {
        priceRange.high = getForPrice[getForPrice.length - 1].price;
        priceRange.low = getForPrice[0].price;
      }
      responseReturn(res, 200, {
        latest_product,
        priceRange,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  query_products = async (req, res) => {
    const parPage = 12;
    req.query.parPage = parPage;
    try {
      const products = await productModel.find({}).sort({
        createdAt: -1,
      });
      const totalProduct = new queryProducts(products, req.query)
        .categoryQuery()

        .searchQuery()
        .priceQuery()
        .ratingQuery()
        .sortByPrice()
        .countProducts();

      /**
       *
       * @recent_searches
       *
       */

      const query = req.query.searchValue;
      const userId = req.id;

      if (userId && query) {
        try {
          // Find the recent searches for the user
          let RecentSearch = await recentSearch.findOne({ userId });

          if (!RecentSearch) {
            // If the user doesn't have a recent search, create a new record
            RecentSearch = new recentSearch({ userId, searches: [query] });
          } else {
            // Check if the query already exists
            if (!RecentSearch.searches.includes(query)) {
              // Add the query to the beginning of the array
              RecentSearch.searches.unshift(query);

              // Limit the array to the latest 10 searches
              if (RecentSearch.searches.length > 10) {
                RecentSearch.searches.pop();
              }
            }
          }

          // Save the recent searches
          await RecentSearch.save();
        } catch (error) {
          console.error(error.message);
        }
      }

      const result = new queryProducts(products, req.query)
        .categoryQuery()

        .searchQuery()
        .ratingQuery()
        .priceQuery()
        .sortByPrice()
        .skip()
        .limit()
        .getProducts();

      responseReturn(res, 200, {
        products: result,
        totalProduct,
        parPage,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  // test
  get_recent_searches = async (req, res) => {
    try {
      const userId = req.id;
      if (userId) {
        const RecentSearches = await recentSearch.findOne({
          userId,
        });
        return responseReturn(res, 200, {
          searches: RecentSearches?.searches,
          message: "recent searches fetched.. ",
          status: 200,
        });
      }
      responseReturn(res, 200, {
        message: "please login to see searches",
        status: 400,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  submit_review = async (req, res) => {
    const { _id, sellerId, customerId, rating, review } = req.body;

    try {
      const ordercheck = await androidCustomerOrderModel.findById(_id);

      if (!ordercheck) {
        return responseReturn(res, 404, { message: "Order not found" });
      }

      if (ordercheck.order_status !== "delivered") {
        return responseReturn(res, 400, {
          message: "After delivery, you can review.",
        });
      }

      // Loop through each product and create review
      for (const product of ordercheck.products) {
        await reviewModel.create({
          productId: product.productId,
          sellerId,
          varientId: product.variantId,
          rating,
          review,
          customerId,
          date: moment().format("LL"),
        });

        // Calculate and update product rating
        let rat = 0;
        const reviews = await reviewModel.find({
          productId: product.productId,
        });

        for (let i = 0; i < reviews.length; i++) {
          rat += reviews[i].rating;
        }

        let productRating = 0;
        if (reviews.length !== 0) {
          productRating = (rat / reviews.length).toFixed(1);
        }

        await productModel.findByIdAndUpdate(product.productId, {
          // rating: productRating,
          rating: 0,
        });
      }

      return responseReturn(res, 201, {
        status: 200,
        message: "Review Success & Rating Updated",
      });
    } catch (error) {
      console.log(error);
      return responseReturn(res, 500, { message: "Something went wrong" });
    }
  };

  get_reviews = async (req, res) => {
    const { varientId } = req.params;
    let { pageNo } = req.query;
    pageNo = parseInt(pageNo) || 1;
    const limit = 5;
    const skipPage = limit * (pageNo - 1);

    try {
      // Aggregate reviews with customer details
      const reviews = await reviewModel.aggregate([
        {
          $match: { varientId: new ObjectId(varientId) },
        },
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customerDetails",
          },
        },
        {
          $unwind: {
            path: "$customerDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            varientId: 1,
            rating: 1,
            review: 1,
            date: 1,
            customerName: { $ifNull: ["$customerDetails.name", "Unknown"] },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $skip: skipPage,
        },
        {
          $limit: limit,
        },
      ]);

      // Total reviews count
      const totalReview = await reviewModel.countDocuments({ varientId });

      // Aggregate for ratings breakdown and average rating
      const ratingData = await reviewModel.aggregate([
        {
          $match: { varientId: new ObjectId(varientId) },
        },
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 },
          },
        },
      ]);

      // Initialize ratings breakdown (1 to 5)
      const rating_review = Array.from({ length: 5 }, (_, i) => ({
        rating: 5 - i,
        sum: 0,
      }));

      // Fill ratings breakdown dynamically
      let totalSum = 0;
      let totalCount = 0;

      ratingData.forEach((item) => {
        const index = 5 - item._id;
        if (index >= 0 && index < 5) {
          rating_review[index].sum = item.count;
          totalSum += item._id * item.count;
          totalCount += item.count;
        }
      });

      // Calculate average rating
      const averageRating =
        totalCount > 0 ? (totalSum / totalCount).toFixed(1) : 0;

      // Send the response
      responseReturn(res, 200, {
        status: 200,
        reviews,
        totalReview,
        averageRating: parseFloat(averageRating),
        rating_review,
      });
    } catch (error) {
      console.log(error);
      responseReturn(res, 500, { message: "Error fetching reviews." });
    }
  };

  getEverything = async (req, res) => {
    try {
      const best_products = await ProductDetailsModel.aggregate([
        {
          $sort: { views: -1 },
        },
        {
          $limit: 4,
        },
        {
          $lookup: {
            from: "categorys",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "subcategory",
            foreignField: "_id",
            as: "subcategory",
          },
        },
        {
          $unwind: {
            path: "$category",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$subcategory",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            slug: 1,
            type: { $literal: "product" },
            name: 1,
            price: 1,
            discount: 1,
            subcategory: "$subcategory.name",
            image: { $arrayElemAt: ["$images", 0] },
          },
        },
      ]);

      // const best_products = await productModel.aggregate([
      //   {
      //     $sort: { createdAt: -1 },
      //   },
      //   {
      //     $limit: 20,
      //   },
      //   {
      //     $project: {
      //       _id: 1,
      //       slug: 1,
      //       type: "product",
      //       name: 1,
      //       price: 1,
      //       subcategory: 1,
      //       discount: 1,
      //       image: { $arrayElemAt: ["$images", 0] },
      //     },
      //   },
      // ]);
      const latest_product = await productModel.aggregate([
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 4,
        },
        {
          $project: {
            _id: 1,
            slug: 1,
            type: "product",
            name: 1,
            price: 1,
            subcategory: 1,
            discount: 1,
            image: { $arrayElemAt: ["$images", 0] },
          },
        },
      ]);
      const topRated_product = await productModel.aggregate([
        {
          $sort: { rating: -1 },
        },
        {
          $limit: 4,
        },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            type: "product",
            price: 1,
            subcategory: 1,
            discount: 1,
            image: { $arrayElemAt: ["$images", 0] },
          },
        },
      ]);
      const discount_product = await productModel.aggregate([
        {
          $sort: { discount: -1 },
        },
        {
          $limit: 4,
        },
        {
          $project: {
            _id: 1,
            name: 1,
            price: 1,
            slug: 1,
            type: "product",
            subcategory: 1,
            discount: 1,
            image: { $arrayElemAt: ["$images", 0] },
          },
        },
      ]);
      const categorys = await categoryModel.find().select("name _id image ");
      const carousel_items = await bannerModel
        .find({ bannerType: "carousel" })
        .select("_id bannerType imgUrl heading");

      const sectionOneAds = await bannerModel
        .find({
          bannerType: "sectionOne",
        })
        .select("_id bannerType imgUrl heading ");
      const sectionTwoAds = await bannerModel
        .find({
          bannerType: "sectionTwo",
        })
        .select("_id bannerType imgUrl heading ");
      const sectionThreeAds = await bannerModel
        .find({
          bannerType: "sectionThree",
        })
        .select("_id bannerType imgUrl heading ");
      const sectionFourAds = await bannerModel
        .find({
          bannerType: "sectionFour",
        })
        .select("_id bannerType imgUrl heading ");

      // const suggestedSubcats = await this.get_suggested_subcategories();

      const suggestedSubcats = await categoryModel.aggregate([
        {
          $lookup: {
            from: "subcategories",
            localField: "subcategories",
            foreignField: "_id",
            as: "subcategories",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            subcategories: {
              $map: {
                input: "$subcategories",
                as: "subcategory",
                in: {
                  subcategoryId: "$$subcategory._id",
                  categoryId: "$$subcategory.categoryId",
                  slug: "$$subcategory.slug",
                  productType: "$$subcategory.productType",
                  type: "subcategory",
                  name: "$$subcategory.name",
                  image: "$$subcategory.image",
                },
              },
            },
          },
        },
      ]);

      console.log("suggestedSubcats", suggestedSubcats);

      responseReturn(res, 200, {
        message: "data fetched successfully",
        status: "",
        homeData: [
          { name: "Carasoule Banners", type: "Banner", data: carousel_items },
          { name: "category", type: "Category", data: categorys },
          { name: "SubCategory", type: "SubCategory", data: suggestedSubcats },
          { name: "best Product", type: "Product", data: best_products },
          {
            name: "Top Rated Product",
            type: "Product",
            data: topRated_product,
          },
          { name: "Ad1", type: "Ad", data: sectionOneAds },
          { name: "Latest Product", type: "Product", data: latest_product },
          {
            name: "Discounted Product",
            type: "Product",
            data: discount_product,
          },
          { name: "Ad2", type: "Ad", data: sectionTwoAds },
        ],

        message: "items fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_suggested_subcategories = async (req, res) => {
    try {
      const categories = await categoryModel.find({}, "name");
      const categoryNames = categories.map((cat) => cat.name);

      const suggestedSubcats = await categoryModel.aggregate([
        {
          $match: {
            name: { $in: categoryNames },
          },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "subcategories",
            foreignField: "_id",
            as: "subcategories",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            subcategories: {
              $map: {
                input: "$subcategories",
                as: "subcategory",
                in: {
                  slug: "$$subcategory.slug",
                  productType: "$$subcategory.productType",
                  type: "subcategory",
                  // name: { $toLower: "$$subcategory.name" },
                  name: "name",
                  categoryName: "$$subcategory.categoryName",
                  image: "$$subcategory.image",
                },
              },
            },
          },
        },
      ]);
      return suggestedSubcats;
      // res.status(200).json({
      //   message: "Suggested subcategories fetched successfully",
      //   data: suggestedSubcats,
      // });
    } catch (error) {
      console.log("Error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  // allProducts = async (req, res) => {
  //   try {
  //     const products = await productModel.aggregate([
  //       {
  //         $project: {
  //           slug: 1,
  //           brand: 1,
  //           price: 1,
  //           stock: 1,
  //           discount: 1,
  //           name: 1,
  //           image: { $arrayElemAt: ["$images", 0] },
  //         },
  //       },
  //     ]);

  //     responseReturn(res, 200, {
  //       message: "products fetched successfully",
  //       status: 200,
  //       products,
  //     });
  //   } catch (error) {
  //     console.log(error.message);
  //   }
  // };

  allProducts = async (req, res) => {
    try {
      // Page & Limit from query params
      let page = parseInt(req.query.page) || 1;
      let limit = 20;
      let skip = (page - 1) * limit;

      // Total product count
      const total = await productModel.countDocuments();

      // Products with pagination
      const products = await productModel.aggregate([
        {
          $project: {
            slug: 1,
            brand: 1,
            price: 1,
            stock: 1,
            discount: 1,
            name: 1,
            image: { $arrayElemAt: ["$images", 0] },
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]);

      const totalPages = Math.ceil(total / limit);

      responseReturn(res, 200, {
        message: "products fetched successfully",
        status: 200,
        currentPage: page,
        totalPages,
        totalProducts: total,
        products,
      });
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 500, {
        message: "Server error",
        status: 500,
      });
    }
  };

  categoryList = async (req, res) => {
    try {
      const list = await categoryModel.aggregate([
        {
          $lookup: {
            from: "subcategories", // Correct name of the subcategory collection
            localField: "subcategories", // The field in 'category' that holds the references
            foreignField: "_id", // The field in 'subcategory' that matches the ObjectId
            as: "subcategories", // The field to store the populated subcategories
          },
        },
        {
          $project: {
            _id: 0, // Hide the _id field from the result
            name: 1, // my target
            subcategories: {
              //here i have to change
              $map: {
                input: "$subcategories", // Iterate over the populated subcategories array
                as: "subcategory",
                in: {
                  slug: "$$subcategory.slug",

                  type: "subcategory",
                  name: "$$subcategory.name", // Include the name of each subcategory
                  image: "$$subcategory.image", // Get the first image if "image" is an array
                },
              },
            },
          },
        },
      ]);

      responseReturn(res, 200, {
        message: "products fetched successfully",
        status: 200,
        list: list.filter((item) => item.subcategories.length > 0),
      });
    } catch (error) {
      console.log(error.message);
    }
  };
  allSubcategorys = async (req, res) => {
    const subCats = await subCategory.find().select("name image ");
    responseReturn(res, 200, {
      message: "products fetched successfully",
      status: 200,
      subcategorys: subCats,
    });
  };
  fetchBySubcat = async (req, res) => {
    try {
      const {
        type,
        subcategoryId,
        categoryId,
        keytype = "",
        keyvalue = "",
      } = req.body;

      let products;

      console.log("check", { type, subcategoryId, categoryId });

      if (keytype && keytype === "category") {
        products = await productModel.find(
          {
            category: new mongoose.Types.ObjectId(categoryId),
          },
          {
            slug: 1,
            brand: 1,
            price: 1,
            stock: 1,
            discount: 1,
            name: 1,
            type: 1,
            discountedPrice: 1,
            subcategory: 1,
            category: 1,
            images: 1,
            _id: 1,
          }
        );
      } else if (keytype && keytype === "brand" && keyvalue) {
        products = await productModel.find(
          {
            // category: new mongoose.Types.ObjectId(categoryId),
            // subcategory: new mongoose.Types.ObjectId(subcategoryId),
            // type: new mongoose.Types.ObjectId(type),
            brand: keyvalue,
          },
          {
            slug: 1,
            brand: 1,
            price: 1,
            stock: 1,
            discount: 1,
            name: 1,
            type: 1,
            discountedPrice: 1,
            subcategory: 1,
            category: 1,
            images: 1,
            _id: 1,
          }
        );
      } else if (keytype && keytype === "gender" && keyvalue) {
        console.log("keytype", keytype);
        console.log("keyvalue", keyvalue);

        const gender = keyvalue.toLowerCase().includes("men")
          ? "men"
          : keyvalue.toLowerCase().includes("women")
          ? "women"
          : null;

        if (!gender) {
          return responseReturn(res, 400, {
            message: "Invalid gender keyword in keyvalue",
            status: 400,
          });
        }

        // Filter using gender — adjust the field name as per your schema
        products = await productModel.find(
          {
            gender: gender,
            // OR if stored in customFields.gender:
            // "customFields.gender": gender
          },
          {
            gender: 1,
            slug: 1,
            brand: 1,
            price: 1,
            stock: 1,
            discount: 1,
            name: 1,
            type: 1,
            discountedPrice: 1,
            subcategory: 1,
            category: 1,
            images: 1,
            _id: 1,
          }
        );
      } else {
        products = await productModel.find(
          {
            category: new mongoose.Types.ObjectId(categoryId),
            subcategory: new mongoose.Types.ObjectId(subcategoryId),
            type: new mongoose.Types.ObjectId(type),
          },
          {
            slug: 1,
            brand: 1,
            price: 1,
            stock: 1,
            discount: 1,
            name: 1,
            type: 1,
            discountedPrice: 1,
            subcategory: 1,
            category: 1,
            images: 1,
            _id: 1,
          }
        );
      }

      responseReturn(res, 200, {
        message: "products fetched successfully",
        status: 200,
        data: products,
      });
    } catch (error) {
      console.error("Error in fetchBySubcat:", error);
      responseReturn(res, 500, {
        message: "Internal Server Error",
        status: 500,
        error: error.message,
      });
    }
  };

  // searchProducts = async (req, res) => {
  //   try {
  //     const { search } = req.params;

  //     if (!search) {
  //       return responseReturn(res, 400, {
  //         message: "Please enter a search value.",
  //         status: 400,
  //       });
  //     }

  //     const searchValue = search.toLowerCase();

  //     // Search categories
  //     const categories = await categoryModel.aggregate([
  //       {
  //         $match: {
  //           name: { $regex: searchValue, $options: "i" },
  //         },
  //       },
  //       {
  //         $project: {
  //           name: 1,
  //           slug: 1,
  //           image: 1,
  //           _id: 1,
  //           type: { $literal: "category" },
  //           keyName: "$_id",
  //         },
  //       },
  //       { $limit: 10 },
  //     ]);

  //     // Search subcategories
  //     const subcategories = await subCategory.aggregate([
  //       {
  //         $match: {
  //           name: { $regex: searchValue, $options: "i" },
  //         },
  //       },
  //       {
  //         $project: {
  //           _id: 1,
  //           name: 1,
  //           slug: 1,
  //           image: 1,
  //           categoryName: 1,
  //           type: { $literal: "subcategory" },
  //           keyName: "$_id",
  //         },
  //       },
  //       { $limit: 10 },
  //     ]);

  //     // Search products
  //     const products = await productModel.aggregate([
  //       {
  //         $match: {
  //           $or: [
  //             { name: { $regex: searchValue, $options: "i" } },
  //             { brand: { $regex: searchValue, $options: "i" } },
  //             { description: { $regex: searchValue, $options: "i" } },
  //             { shopName: { $regex: searchValue, $options: "i" } },
  //           ],
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: "subcategories",
  //           localField: "subcategory",
  //           foreignField: "_id",
  //           as: "subcategoryDetails",
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: "$subcategoryDetails",
  //           preserveNullAndEmptyArrays: true,
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: "$subcategoryDetails.productType",
  //           name: { $first: "$subcategoryDetails.name" },
  //           slug: { $first: "$subcategoryDetails.slug" },
  //           image: { $first: "$subcategoryDetails.image" },
  //           category: { $first: "$subcategoryDetails.categoryName" },
  //           categoryId: { $first: "$subcategoryDetails.categoryId" },
  //           subcategoryId: { $first: "$subcategoryDetails._id" },
  //           type: { $first: "brand" },
  //           keyName: { $first: "$brand" },
  //         },
  //       },
  //       { $limit: 30 },
  //     ]);

  //     // If only products found, add brands as a separate type
  //     let finalData = [];

  //     if (categories.length === 0 && subcategories.length === 0) {
  //       const brands = await productModel.aggregate([
  //         {
  //           $match: {
  //             $or: [
  //               { name: { $regex: searchValue, $options: "i" } },
  //               { brand: { $regex: searchValue, $options: "i" } },
  //               { description: { $regex: searchValue, $options: "i" } },
  //               { shopName: { $regex: searchValue, $options: "i" } },
  //             ],
  //           },
  //         },

  //         { $limit: 10 },
  //       ]);

  //       finalData = [...products];
  //     } else {
  //       finalData = [...categories, ...subcategories, ...products];
  //     }

  //     // Save recent search
  //     const userId = req.id;
  //     if (userId && search) {
  //       try {
  //         let RecentSearch = await recentSearch.findOne({ userId });
  //         if (!RecentSearch) {
  //           RecentSearch = new recentSearch({
  //             userId,
  //             searches: [
  //               { searchTerm: search, image: products[0]?.images || null },
  //             ],
  //           });
  //         } else {
  //           const existingIndex = RecentSearch.searches.findIndex(
  //             (item) => item.searchTerm === search
  //           );
  //           if (existingIndex === -1) {
  //             RecentSearch.searches.unshift({
  //               searchTerm: search,
  //               image: products[0]?.images || null,
  //             });
  //             if (RecentSearch.searches.length > 10) {
  //               RecentSearch.searches.pop();
  //             }
  //           } else {
  //             const existing = RecentSearch.searches.splice(
  //               existingIndex,
  //               1
  //             )[0];
  //             RecentSearch.searches.unshift(existing);
  //           }
  //         }
  //         await RecentSearch.save();
  //       } catch (error) {
  //         console.error("Error saving recent search:", error.message);
  //       }
  //     }

  //     // Send response
  //     responseReturn(res, 200, {
  //       message: "Data fetched successfully.",
  //       data: finalData,
  //       status: 200,
  //     });
  //   } catch (error) {
  //     console.error("Error in searchProducts:", error);
  //     responseReturn(res, 500, {
  //       message: "An error occurred while fetching the data.",
  //       status: 500,
  //     });
  //   }
  // };

  // new ----

  searchProducts2 = async (req, res) => {
    try {
      const { search } = req.params;

      if (!search) {
        return responseReturn(res, 400, {
          message: "Please enter a search value.",
          status: 400,
        });
      }

      const searchValue = search.toLowerCase();
      const searchKeywords = searchValue.split(" ").filter(Boolean); // ["redmi", "note", "13"]

      // Category search
      const categorys = await categoryModel.aggregate([
        {
          $match: {
            name: { $regex: searchValue, $options: "i" },
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,
            image: 1,
            _id: 1,
            type: "category",
          },
        },
        { $limit: 10 },
      ]);

      // Subcategory search
      const subcategorys = await subCategory.aggregate([
        {
          $match: {
            name: { $regex: searchValue, $options: "i" },
          },
        },
        {
          $project: {
            name: 1,
            image: 1,
            slug: 1,
            _id: 1,
            type: "subcategory",
          },
        },
        { $limit: 10 },
      ]);

      // Build dynamic search conditions from split words
      const regexConditions = searchKeywords.map((word) => ({
        $or: [
          { name: { $regex: word, $options: "i" } },
          { brand: { $regex: word, $options: "i" } },
          { description: { $regex: word, $options: "i" } },
          { shopName: { $regex: word, $options: "i" } },
        ],
      }));

      // Product search
      const result = await productModel.aggregate([
        {
          $match: {
            $and: regexConditions,
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,
            shopName: 1,
            brand: 1,
            price: 1,
            type: "product",
            discount: 1,
            discountedPrice: 1,
            rating: 1,
            returnPolicy: 1,
            free_delivery: 1,
            images: { $arrayElemAt: ["$images", 0] },
          },
        },
        { $limit: 30 },
      ]);

      const image = result[0]?.images;
      const userId = req.id;

      if (userId && search) {
        try {
          let RecentSearch = await recentSearch.findOne({ userId });

          if (!RecentSearch) {
            RecentSearch = new recentSearch({
              userId,
              searches: [{ searchTerm: search, image: image || null }],
            });
          } else {
            const existingSearchIndex = RecentSearch.searches.findIndex(
              (item) => item.searchTerm === search
            );

            if (existingSearchIndex === -1) {
              RecentSearch.searches.unshift({
                searchTerm: search,
                image: image || null,
              });

              if (RecentSearch.searches.length > 10) {
                RecentSearch.searches.pop();
              }
            } else {
              const existingSearch = RecentSearch.searches.splice(
                existingSearchIndex,
                1
              )[0];
              RecentSearch.searches.unshift(existingSearch);
            }
          }

          await RecentSearch.save();
        } catch (error) {
          console.error("Error saving recent search:", error.message);
        }
      }

      responseReturn(res, 200, {
        message: "Data fetched successfully.",
        data: [...categorys, ...subcategorys, ...result],
        status: 200,
      });
    } catch (error) {
      console.error("Error in suggestSearch:", error);
      responseReturn(res, 500, {
        message: "An error occurred while fetching the data.",
        status: 500,
      });
    }
  };

  searchProductsbk = async (req, res) => {
    try {
      const { search } = req.params;
      const userId = req.id;

      if (!search) {
        return responseReturn(res, 400, {
          message: "Please enter a search value.",
          status: 400,
        });
      }

      const searchValue = search.toLowerCase();
      const searchKeywords = searchValue.split(" ").filter(Boolean);

      const wordRegex = new RegExp(`\\b${searchValue}\\b`, "i");
      const keywordRegexes = searchKeywords.map(
        (kw) => new RegExp(`\\b${kw}\\b`, "i")
      );

      // 🧠 Product name / brand match
      const searchSuggestions = await productModel.aggregate([
        {
          $match: {
            $or: [
              { name: { $regex: wordRegex } },
              { brand: { $regex: wordRegex } },
            ],
          },
        },
        {
          $project: {
            name: 1,
            brand: 1,
            categoryId: "$category",
            subcategoryId: "$subcategory",
            image: { $arrayElemAt: ["$images", 0] },
            type: 1,
            gender: 1,
          },
        },
        { $limit: 20 },
      ]);

      const suggestionsSet = new Set();
      const suggestions = [];

      for (const item of searchSuggestions) {
        if (item.name && !suggestionsSet.has(item.name)) {
          suggestions.push({
            name: item.name,
            keytype: "product",
            productId: item._id,
            categoryId: item.categoryId,
            subcategoryId: item.subcategoryId,
            type: item.type,
            image: item.image,
          });
          suggestionsSet.add(item.name);
        }

        if (item.brand && !suggestionsSet.has(item.brand)) {
          suggestions.push({
            name: item.brand,
            keytype: "brand",
            productId: "",
            categoryId: item.categoryId || "",
            subcategoryId: item.subcategoryId || "",
            type: item.type || "",
            image: item.image || "",
          });
          suggestionsSet.add(item.brand);
        }
      }

      // 👕 Gender-based suggestions
      const genderSuggestions = [];
      const genderTerms = ["Men", "Women"];
      const clothKeywords = [
        "shirt",
        "jeans",
        "cloth",
        "tshirt",
        "kurta",
        "trouser",
      ];

      if (clothKeywords.some((kw) => searchValue.includes(kw))) {
        genderTerms.forEach((gender) => {
          genderSuggestions.push({
            name: `${searchValue} for ${gender.toLowerCase()}`,
            keytype: "gender",
            productId: "",
            categoryId: "",
            subcategoryId: "",
            type: "",
            image: "",
          });
        });
      }

      // 📁 Category suggestions
      const categorySuggestions = await categoryModel
        .aggregate([
          {
            $match: {
              $or: [
                { name: { $regex: wordRegex } },
                {
                  $and: searchKeywords.map((keyword) => ({
                    name: { $regex: new RegExp(`\\b${keyword}\\b`, "i") },
                  })),
                },
              ],
            },
          },
          {
            $project: {
              name: 1,
              slug: 1,
              image: 1,
              categoryId: "$_id",
            },
          },
          { $limit: 5 },
        ])
        .then((results) =>
          results.map((item) => ({
            name: item.name,
            keytype: "category",
            productId: "",
            categoryId: item.categoryId,
            subcategoryId: "",
            type: "",
            image: item.image || "",
          }))
        );

      // 📂 Subcategory suggestions
      const subcategorySuggestions = await subCategory
        .aggregate([
          {
            $match: {
              $or: [
                { name: { $regex: wordRegex } },
                {
                  $and: searchKeywords.map((keyword) => ({
                    name: { $regex: new RegExp(`\\b${keyword}\\b`, "i") },
                  })),
                },
              ],
            },
          },
          {
            $project: {
              name: 1,
              slug: 1,
              image: 1,
              categoryId: 1,
              subcategoryId: "$_id",
              type: "$productType",
            },
          },
          { $limit: 10 },
        ])
        .then((results) =>
          results.map((item) => ({
            name: item.name,
            keytype: "subcategory",
            productId: "",
            categoryId: item.categoryId || "",
            subcategoryId: item.subcategoryId || "",
            type: item.type || "",
            image: item.image || "",
          }))
        );

      // 🕓 Recent searches
      let recentSuggestions = [];
      if (userId) {
        const existing = await recentSearch.findOne({ userId });
        if (existing) {
          recentSuggestions = existing.searches.map((s) => ({
            name: s.searchTerm || "",
            keytype: "recent",
            productId: "",
            categoryId: "",
            subcategoryId: "",
            type: "",
            image: s.image || "",
          }));
        }
      }

      // 💾 Save recent search
      const image = searchSuggestions[0]?.image || null;
      if (userId && search) {
        try {
          let recentDoc = await recentSearch.findOne({ userId });
          if (!recentDoc) {
            recentDoc = new recentSearch({
              userId,
              searches: [{ searchTerm: search, image }],
            });
          } else {
            const index = recentDoc.searches.findIndex(
              (item) => item.searchTerm === search
            );

            if (index === -1) {
              recentDoc.searches.unshift({ searchTerm: search, image });
              if (recentDoc.searches.length > 10) recentDoc.searches.pop();
            } else {
              const existing = recentDoc.searches.splice(index, 1)[0];
              recentDoc.searches.unshift(existing);
            }
          }

          await recentDoc.save();
        } catch (error) {
          console.error("Error saving recent search:", error.message);
        }
      }

      // ✅ Final Response
      const finalSuggestions = [
        ...categorySuggestions,
        ...subcategorySuggestions,
        ...genderSuggestions,
        ...suggestions,
        // ...recentSuggestions,
      ];

      responseReturn(res, 200, {
        message: "Search suggestions fetched successfully.",
        status: 200,
        data: {
          suggestions: finalSuggestions,
        },
      });
    } catch (error) {
      console.error("Error in suggestSearch:", error);
      responseReturn(res, 500, {
        message: "An error occurred while fetching suggestions.",
        status: 500,
      });
    }
  };

  searchProducts3 = async (req, res) => {
    try {
      const { search } = req.params;
      const userId = req.id;

      if (!search) {
        return responseReturn(res, 400, {
          message: "Please enter a search value.",
          status: 400,
        });
      }

      const searchValue = search.toLowerCase();
      const searchKeywords = searchValue.split(" ").filter(Boolean);

      // Gender detection
      const genderKeywords = {
        men: "Men",
        women: "Women",
        male: "Men",
        female: "Women",
        boys: "Boys",
        girls: "Girls",
        kids: "Kids",
      };

      let genderFilter = null;
      for (const word of searchKeywords) {
        if (genderKeywords[word]) {
          genderFilter = genderKeywords[word];
          break;
        }
      }

      const refinedKeywords = searchKeywords.filter((w) => !genderKeywords[w]);

      // Build dynamic regex search conditions
      const regexConditions = refinedKeywords.map((word) => ({
        $or: [
          { name: { $regex: word, $options: "i" } },
          { description: { $regex: word, $options: "i" } },
          { brand: { $regex: word, $options: "i" } },
          { tags: { $regex: word, $options: "i" } },
          { category: { $regex: word, $options: "i" } },
          { subcategory: { $regex: word, $options: "i" } },
        ],
      }));

      const productMatchStage = {
        $and: regexConditions,
      };
      if (genderFilter) {
        productMatchStage.$and.push({ gender: genderFilter });
      }

      // Search Suggestions from Product Names and Brands
      const searchSuggestions = await productModel.aggregate([
        {
          $match: {
            $or: [
              { name: { $regex: searchValue, $options: "i" } },
              { brand: { $regex: searchValue, $options: "i" } },
            ],
          },
        },
        {
          $project: {
            name: 1,
            brand: 1,
            type: "suggestion",
          },
        },
        { $limit: 10 },
      ]);

      // Unique suggestions (from name or brand)
      const suggestionsSet = new Set();
      const suggestions = [];
      for (const item of searchSuggestions) {
        if (item.name && !suggestionsSet.has(item.name)) {
          suggestions.push({
            productId: item._id,
            name: item.name,
            type: "product",
          });
          suggestionsSet.add(item.name);
        }
        if (item.brand && !suggestionsSet.has(item.brand)) {
          suggestions.push({ name: item.brand, type: "brand" });
          suggestionsSet.add(item.brand);
        }
      }

      // Category Suggestions
      const categorySuggestions = await categoryModel.aggregate([
        {
          $match: {
            name: { $regex: searchValue, $options: "i" },
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,
            image: 1,
            categoryId: "$_id",
            type: "category",
          },
        },
        { $limit: 5 },
      ]);

      // Subcategory Suggestions
      const subcategorySuggestions = await subCategory.aggregate([
        {
          $match: {
            name: { $regex: searchValue, $options: "i" },
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,
            image: 1,
            subcategoryId: "$_id",
            categoryId: 1,
            type: "subcategory",
          },
        },
        { $limit: 5 },
      ]);

      // Recent Searches
      let recent = [];
      if (userId) {
        const existing = await recentSearch.findOne({ userId });
        if (existing) {
          recent = existing.searches.map((s) => ({
            name: s.searchTerm,
            image: s.image,
            type: "recent",
          }));
        }
      }

      // Save new recent search
      const image = searchSuggestions[0]?.image || null;
      if (userId && search) {
        try {
          let recentDoc = await recentSearch.findOne({ userId });
          if (!recentDoc) {
            recentDoc = new recentSearch({
              userId,
              searches: [{ searchTerm: search, image }],
            });
          } else {
            const index = recentDoc.searches.findIndex(
              (item) => item.searchTerm === search
            );

            if (index === -1) {
              recentDoc.searches.unshift({ searchTerm: search, image });
              if (recentDoc.searches.length > 10) recentDoc.searches.pop();
            } else {
              const existing = recentDoc.searches.splice(index, 1)[0];
              recentDoc.searches.unshift(existing);
            }
          }

          await recentDoc.save();
        } catch (error) {
          console.error("Error saving recent search:", error.message);
        }
      }

      // Final response
      responseReturn(res, 200, {
        message: "Search suggestions fetched successfully.",
        status: 200,
        data: {
          suggestions,
          categories: categorySuggestions,
          subcategories: subcategorySuggestions,
          recent,
        },
      });
    } catch (error) {
      console.error("Error in suggestSearch:", error);
      responseReturn(res, 500, {
        message: "An error occurred while fetching suggestions.",
        status: 500,
      });
    }
  };

  searchProducts = async (req, res) => {
    try {
      const { search } = req.params;
      const userId = req.id;

      if (!search) {
        return responseReturn(res, 400, {
          message: "Please enter a search value.",
          status: 400,
        });
      }

      const searchValue = search.toLowerCase();

      // Step 1: Fetch products for Fuse.js
      const productData = await productModel
        .find(
          {},
          {
            name: 1,
            brand: 1,
            category: 1,
            subcategory: 1,
            images: 1,
            type: 1,
            gender: 1,
          }
        )
        .limit(100);

      // Step 2: Prepare list for Fuse
      const fuseList = [];
      productData.forEach((product) => {
        if (product.name) {
          fuseList.push({
            keytype: "product",
            value: product.name,
            data: product,
          });
        }
        if (product.brand) {
          fuseList.push({
            keytype: "brand",
            value: product.brand,
            data: product,
          });
        }
      });

      const fuse = new Fuse(fuseList, {
        keys: ["value"],
        threshold: 0.4,
        minMatchCharLength: 2,
      });

      const fuseResults = fuse.search(searchValue, { limit: 20 });

      const suggestionsSet = new Set();
      const suggestions = [];

      fuseResults.forEach(({ item }) => {
        if (!suggestionsSet.has(item.value)) {
          suggestions.push({
            name: item.value,
            keytype: item.keytype,
            productId: item.data._id || "",
            categoryId: item.data.category || "",
            subcategoryId: item.data.subcategory || "",
            type: item.data.type || "",
            image: item.data.images ? item.data.images[0] : "",
          });
          suggestionsSet.add(item.value);
        }
      });

      // 👕 Gender-based suggestions (for keywords like "shirt", "jeans" etc.)
      const genderSuggestions = [];
      const genderTerms = ["Men", "Women"];
      const clothKeywords = [
        "shirt",
        "jeans",
        "cloth",
        "tshirt",
        "kurta",
        "trouser",
      ];

      if (clothKeywords.some((kw) => searchValue.includes(kw))) {
        genderTerms.forEach((gender) => {
          genderSuggestions.push({
            name: `${searchValue} for ${gender.toLowerCase()}`,
            keytype: "gender",
            productId: "",
            categoryId: "",
            subcategoryId: "",
            type: "",
            image: "",
          });
        });
      }

      // 🧠 Gender-specific category/subcategory/type suggestions
      const genderMatch = searchValue.match(/(men|women)/i);
      if (genderMatch) {
        const gender =
          genderMatch[1].charAt(0).toUpperCase() +
          genderMatch[1].slice(1).toLowerCase();

        const genderBasedProducts = await productModel.aggregate([
          { $match: { gender } },
          {
            $group: {
              _id: {
                category: "$category",
                subcategory: "$subcategory",
                type: "$type",
              },
            },
          },
          { $limit: 5 },
        ]);

        genderBasedProducts.forEach((item) => {
          genderSuggestions.push({
            name: `${gender} products - ${item._id.type || "N/A"}`,
            keytype: "gender-category",
            productId: "",
            categoryId: item._id.category || "",
            subcategoryId: item._id.subcategory || "",
            type: item._id.type || "",
            image: "",
          });
        });
      }

      // 📁 Category suggestions
      const searchKeywords = searchValue.split(" ").filter(Boolean);
      const wordRegex = new RegExp(`\\b${searchValue}\\b`, "i");

      const categorySuggestions = await categoryModel
        .aggregate([
          {
            $match: {
              $or: [
                { name: { $regex: wordRegex } },
                {
                  $and: searchKeywords.map((keyword) => ({
                    name: { $regex: new RegExp(`\\b${keyword}\\b`, "i") },
                  })),
                },
              ],
            },
          },
          {
            $project: {
              name: 1,
              slug: 1,
              image: 1,
              categoryId: "$_id",
            },
          },
          { $limit: 5 },
        ])
        .then((results) =>
          results.map((item) => ({
            name: item.name,
            keytype: "category",
            productId: "",
            categoryId: item.categoryId,
            subcategoryId: "",
            type: "",
            image: item.image || "",
          }))
        );

      // 📂 Subcategory suggestions
      const subcategorySuggestions = await subCategory
        .aggregate([
          {
            $match: {
              $or: [
                { name: { $regex: wordRegex } },
                {
                  $and: searchKeywords.map((keyword) => ({
                    name: { $regex: new RegExp(`\\b${keyword}\\b`, "i") },
                  })),
                },
              ],
            },
          },
          {
            $project: {
              name: 1,
              slug: 1,
              image: 1,
              categoryId: 1,
              subcategoryId: "$_id",
              type: "$productType",
            },
          },
          { $limit: 10 },
        ])
        .then((results) =>
          results.map((item) => ({
            name: item.name,
            keytype: "subcategory",
            productId: "",
            categoryId: item.categoryId || "",
            subcategoryId: item.subcategoryId || "",
            type: item.type || "",
            image: item.image || "",
          }))
        );

      // 🕓 Recent searches
      let recentSuggestions = [];
      if (userId) {
        const existing = await recentSearch.findOne({ userId });
        if (existing) {
          recentSuggestions = existing.searches.map((s) => ({
            name: s.searchTerm || "",
            keytype: "recent",
            productId: "",
            categoryId: "",
            subcategoryId: "",
            type: "",
            image: s.image || "",
          }));
        }
      }

      // 💾 Save recent search
      const image = suggestions[0]?.image || null;
      if (userId && search) {
        try {
          let recentDoc = await recentSearch.findOne({ userId });
          if (!recentDoc) {
            recentDoc = new recentSearch({
              userId,
              searches: [{ searchTerm: search, image }],
            });
          } else {
            const index = recentDoc.searches.findIndex(
              (item) => item.searchTerm === search
            );

            if (index === -1) {
              recentDoc.searches.unshift({ searchTerm: search, image });
              if (recentDoc.searches.length > 10) recentDoc.searches.pop();
            } else {
              const existing = recentDoc.searches.splice(index, 1)[0];
              recentDoc.searches.unshift(existing);
            }
          }

          await recentDoc.save();
        } catch (error) {
          console.error("Error saving recent search:", error.message);
        }
      }

      // ✅ Final Response
      const finalSuggestions = [
        ...categorySuggestions,
        ...subcategorySuggestions,
        ...genderSuggestions,
        ...suggestions,
        // ...recentSuggestions,
      ];

      responseReturn(res, 200, {
        message: "Search suggestions fetched successfully.",
        status: 200,
        data: {
          suggestions: finalSuggestions,
        },
      });
    } catch (error) {
      console.error("Error in suggestSearch:", error);
      responseReturn(res, 500, {
        message: "An error occurred while fetching suggestions.",
        status: 500,
      });
    }
  };

  new_search_result = async (req, res) => {
    try {
      const { type, name } = req.body;

      if (type === "brand") {
      } else if (type === "category") {
      } else if (type === "subcategory") {
      } else if (type === "product") {
      } else if (type === "gender") {
      }
    } catch (error) {
      console.error("Error in suggestSearch:", error);
      responseReturn(res, 500, {
        message: "An error occurred while fetching suggestions.",
        status: 500,
      });
    }
  };

  suggestSearch = async (req, res) => {
    try {
      const { search } = req.params;

      if (!search) {
        return responseReturn(res, 200, {
          message: "Please enter a search value.",
          status: 400,
        });
      }

      const searchValue = search.toLowerCase();

      const result = await productModel.aggregate([
        {
          $match: {
            $or: [
              { name: { $regex: searchValue, $options: "i" } },
              { category: { $regex: searchValue, $options: "i" } },
              { subcategory: { $regex: searchValue, $options: "i" } },
              { brand: { $regex: searchValue, $options: "i" } },
              { description: { $regex: searchValue, $options: "i" } },
              { shopName: { $regex: searchValue, $options: "i" } },
            ],
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,

            images: { $arrayElemAt: ["$images", 0] },
          },
        },
        { $limit: 10 }, // Limit the number of results to 30
      ]);

      responseReturn(res, 200, {
        message: "Data fetched successfully.",
        data: result,
        status: 200,
      });
    } catch (error) {
      console.error("Error in suggestSearch:", error);
      responseReturn(res, 500, {
        message: "An error occurred while fetching the data.",
        status: 500,
      });
    }
  };

  getFilterOptions = async (req, res) => {
    const { productType } = req.params;

    try {
      const filter = await filteroptionModel.findOne({ productType });

      let options = [];

      if (filter?.options) {
        options = filter.options.filter((opt) => opt !== "color"); // "color" hata diya
      }

      responseReturn(res, 200, {
        status: 200,
        options,
        message: "filters fetched successfully",
      });
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 200, {
        status: 500,

        message: "filters fetching failed",
      });
    }
  };

  getFilterValues = async (req, res) => {
    const { productType, option, categoryId } = req.query;

    try {
      const subCategories = await subCategory.find({
        productType: productType,
        categoryId: categoryId,
      });

      const subCategoryNames = subCategories.map((sub) => sub.name);
      const products = await productModel.find({
        subcategory: { $in: subCategoryNames },
      });

      let values = [];

      if (option == "size") {
        values = [
          ...new Set(
            products
              .map((product) => product[option])
              .filter(
                (value) => value !== null && value !== undefined && value !== ""
              )
              .flatMap((value) => value.split(" "))
          ),
        ].map((item, idx) => ({ value: item, option, productType }));
      } else {
        values = [
          ...new Set(
            products
              .map((product) => product[option])
              .filter(
                (value) => value !== null && value !== undefined && value !== ""
              )
          ),
        ].map((item, idx) => ({ value: item, option, productType }));
      }

      responseReturn(res, 200, {
        status: 200,

        data: values,
        message: "filters fetched successfully",
      });
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 200, {
        status: 500,

        message: "filters fetching failed",
      });
    }
  };

  getFilterProducts = async (req, res) => {
    const { productType, option, value, category, subcategory } = req.query;

    try {
      let products = [];
      if (option !== "size") {
        products = await productModel.find({
          type: productType,
          category: category,
          subcategory: subcategory,
          [option]: value,
        });
      } else {
        products = await productModel
          .find({
            type: productType,
            size: new RegExp(`\\b${value}\\b`), // Matches "8" as a whole word
            category: category,
            subcategory: subcategory,
          })
          .select(
            "_id name slug category subcategory brand price stock discount images "
          );
      }

      responseReturn(res, 200, {
        status: 200,

        data: products,
        message: "products fetched successfully",
      });
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 200, {
        status: 500,

        message: "filters fetching failed",
      });
    }
  };
}

module.exports = new homeControllers();
