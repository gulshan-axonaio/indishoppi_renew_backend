const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const { responseReturn } = require("../../utiles/response");
const filteroptionModel = require("../../models/filteroptionModel");
const sellerPickupLocationModel = require("../../models/sellerPickupLocationModel");
const createDynamicProductSchema = require("../../models/productModel");
const createDynamicVariantSchema = require("../../models/productDetailsModel");
const { log } = require("handlebars/runtime");
let productModel = null;
let ProductDetailsModel = null;

const initProductModel = async () => {
  productModel = await createDynamicProductSchema();
  ProductDetailsModel = await createDynamicVariantSchema();
};
initProductModel();
class productController {
  add_product = async (req, res) => {
    const { id } = req;
    const chek = req.body;

    // console.log("chek", chek);

    // return;

    try {
      // Extract dynamic fields from filteroptionModel
      const fields = await filteroptionModel.find({});
      let allOptions = [];
      fields.forEach((field) => {
        if (field.options && field.options.length > 0) {
          allOptions = [...allOptions, ...field.options];
        }
      });
      const uniqueOptions = [...new Set(allOptions)];

      let dynamicFields = {};
      uniqueOptions.forEach((fieldName) => {
        if (chek[fieldName] !== undefined) {
          dynamicFields[fieldName] = chek[fieldName];
        }
      });

      // Destructure static fields
      let {
        type,
        name,
        category,
        subcategory,
        description,
        stock,
        price,
        discount,
        discountedPrice,
        shopName,
        brand,
        free_delivery,
        imageUrls,
        color,
        colorCode,
      } = req.body;

      // Validation
      if (
        !name ||
        !category ||
        !subcategory ||
        !type ||
        !stock ||
        !price ||
        !shopName
      ) {
        return responseReturn(res, 400, {
          message: "please provide details correctly",
        });
      }
      if (!imageUrls || imageUrls.length === 0) {
        return responseReturn(res, 400, {
          message: "At least one image is required",
        });
      }

      // Create slug
      name = name.trim();
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-");

      // Create product
      const product = await productModel.create({
        sellerId: id,
        name,
        slug,
        shopName,
        type,
        subcategory,
        category,
        description: description.trim(),
        stock: parseInt(stock),
        price: parseInt(price),
        discount: parseInt(discount),
        discountedPrice,
        brand: brand.trim(),
        images: imageUrls,
        free_delivery,
        color,
        colorCode,
        ...dynamicFields,
      });

      // Create product detail entry
      const variant = await ProductDetailsModel.create({
        sellerId: id,
        productId: product._id,
        type,
        name,
        slug,
        shopName,
        subcategory,
        category,
        description: description.trim(),
        price: parseInt(price),
        discount: parseInt(discount),
        discountedPrice,
        stock,
        color,
        colorCode,
        free_delivery,
        brand: brand.trim(),
        images: imageUrls,
        ...dynamicFields,
      });

      // Push variant ID to productModel
      if (variant) {
        await productModel.findOneAndUpdate(
          { _id: product._id },
          {
            $addToSet: {
              variations: variant._id,
            },
          },
          { new: true }
        );
      }

      responseReturn(res, 201, { message: "product added successfully" });
    } catch (error) {
      console.log(error, "error");
      responseReturn(res, 500, { error: error.message });
    }
  };

  products_get = async (req, res) => {
    const { page, searchValue, parPage } = req.query;
    const { id } = req;

    const skipPage = parseInt(parPage) * (parseInt(page) - 1);

    try {
      if (searchValue) {
        const products = await productModel
          .find({
            $text: { $search: searchValue },
            sellerId: id,
          })
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalProduct = await productModel
          .find({
            $text: { $search: searchValue },
            sellerId: id,
          })
          .countDocuments();
        responseReturn(res, 200, { totalProduct, products });
      } else {
        const products = await productModel
          .find({ sellerId: id })
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalProduct = await productModel
          .find({ sellerId: id })
          .countDocuments();
        responseReturn(res, 200, { totalProduct, products });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  //delete product
  product_delete = async (req, res) => {
    const { productId } = req.params;
    try {
      await productModel.findByIdAndDelete(productId);
      // await ProductDetailsModel.findByIdAndDelete(productId);
      await ProductDetailsModel.deleteMany({ productId: productId });
      responseReturn(res, 200, {
        message: "product deleted successfully",
        productId,
      });
    } catch (error) {
      responseReturn(res, 500, { message: error.message });
    }
  };
  //   -------------------------------

  //get product
  product_get = async (req, res) => {
    const { productId } = req.params;

    try {
      const product = await productModel.findById(productId);
      responseReturn(res, 200, { product });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_pickup_location = async (req, res) => {
    const { locationId } = req.params;

    console.log("locationId", locationId);

    try {
      const pickup_locaton = await sellerPickupLocationModel.findById(
        locationId
      );

      console.log("pickup_locaton", pickup_locaton);

      responseReturn(res, 200, { pickup_locaton });
    } catch (error) {
      console.log(error.message);
    }
  };

  product_detail = async (req, res) => {
    try {
      const { variantId, size } = req.body;

      // Find the document by variantId and size
      const variant = await ProductDetailsModel.findOne({
        _id: variantId,
        // size: { $regex: new RegExp(`\\b${size}\\b`, "i") },
      });

      if (!variant) {
        return res
          .status(404)
          .json({ message: "Variant not found", status: 400 });
      }

      // Modify the output object to replace the size field
      const modifiedVariant = {
        ...variant.toObject(), // Convert Mongoose document to plain object
        size, // Replace size field with the given size
      };

      return res.status(200).json({
        message: "product details fetched",
        product: {
          productDetails: modifiedVariant,
          priceDetails: {
            listedPrice: modifiedVariant.price,
            discount: modifiedVariant.discount,
            offerPrice: modifiedVariant.discountedPrice,
          },
        },
        status: 200,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Internal Server Error", error, status: 400 });
    }
  };

  related_products = async (req, res) => {
    const { productId } = req.params;
    console.log(productId);

    try {
      const myProduct = await productModel.findById(productId);

      if (myProduct) {
        const products = await productModel
          .find({
            $or: [
              { type: myProduct.type },
              { category: myProduct.category },
              { subcategory: myProduct.subcategory },
            ],
          })
          .limit(10)
          .sort({ createdAt: -1 });

        responseReturn(res, 200, {
          products,
          message: "products fetched successfully",
          status: 200,
        });
      }
      responseReturn(res, 200, {
        message: "products not find",
        status: 401,
      });
    } catch (error) {
      console.log(error.message);
    }
  };
  //   -------------------------------
  product_update = async (req, res) => {
    const chek = req.body;

    const fields = await filteroptionModel.find({});
    let allOptions = [];
    fields.forEach((field) => {
      if (field.options && field.options.length > 0) {
        allOptions = [...allOptions, ...field.options];
      }
      // console.log("Field object:", field);
    });

    const uniqueOptions = [...new Set(allOptions)];

    let dynamicFields = {};
    uniqueOptions.forEach((fieldName) => {
      if (chek[fieldName] !== undefined) {
        dynamicFields[fieldName] = chek[fieldName];
      }
    });
    let {
      productId,
      category,
      subcategory,
      type,
      name,
      stock,
      brand,
      price,
      discount,
      discountedPrice,
      description,
      color,
      colorCode,
    } = req.body;

    const pname = name.trim();
    const slug = pname
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");

    // console.log("finalRequest", {
    //   productId,
    //   category,
    //   subcategory,
    //   type,
    //   name,
    //   stock,
    //   brand,
    //   price,
    //   discount,
    //   discountedPrice,
    //   description,
    //   color,
    //   colorCode,
    //   slug,
    //   ...dynamicFields,
    // });

    // return;

    try {
      const existing = await productModel.findById(productId);
      if (!existing) {
        responseReturn(res, 200, {
          message: "Product Not foind",
        });
      }

      const updated = await productModel.findByIdAndUpdate(
        productId,
        {
          category,
          subcategory,
          type,
          name,
          stock,
          brand,
          price,
          discount,
          discountedPrice,
          description,
          color,
          colorCode,
          slug,
          ...dynamicFields,
        },
        { new: true }
      );

      const updatedProduct = await productModel.findById(productId);

      if (updatedProduct.variations && updatedProduct.variations.length > 0) {
        const variantId = updatedProduct.variations[0];

        await ProductDetailsModel.findByIdAndUpdate(
          variantId,
          {
            category,
            subcategory,
            type,
            name,
            stock,
            brand,
            price,
            discount,
            discountedPrice,
            description,
            color,
            colorCode,
            slug,
            ...dynamicFields,
          },
          { new: true }
        );

        // console.log("Variant updated in ProductDetailsModel:", variantId);
      }

      responseReturn(res, 200, {
        product: updatedProduct,
        message: "product update success",
      });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  product_types = async (req, res) => {
    try {
      const product = await filteroptionModel.find();
      responseReturn(res, 200, { product, message: "fetch success" });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  fetch_product_byId = async (req, res) => {
    const { productId } = req.body;

    try {
      const product = await productModel
        .findById(productId)
        .select("name category subcategory type brand");
      // console.log("productId", product);
      responseReturn(res, 200, { product, message: "fetch success" });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  product_varient_update = async (req, res) => {
    const chek = req.body;

    const fields = await filteroptionModel.find({});
    let allOptions = [];
    fields.forEach((field) => {
      if (field.options && field.options.length > 0) {
        allOptions = [...allOptions, ...field.options];
      }
      // console.log("Field object:", field);
    });

    const uniqueOptions = [...new Set(allOptions)];

    let dynamicFields = {};
    uniqueOptions.forEach((fieldName) => {
      if (chek[fieldName] !== undefined) {
        dynamicFields[fieldName] = chek[fieldName];
      }
    });
    let {
      varientId,
      productId,
      category,
      subcategory,
      type,
      name,
      stock,
      brand,
      price,
      discount,
      discountedPrice,
      description,
      color,
      colorCode,
      isVarient,
    } = req.body;

    const pname = name.trim();
    const slug = pname
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");

    // console.log("finalRequest", {
    //   varientId,
    //   productId,
    //   category,
    //   subcategory,
    //   type,
    //   name,
    //   stock,
    //   brand,
    //   price,
    //   discount,
    //   discountedPrice,
    //   description,
    //   color,
    //   colorCode,
    //   slug,
    //   ...dynamicFields,
    // });

    // return;

    try {
      console.log("varientId", varientId);

      const existing = await ProductDetailsModel.findById(varientId);
      if (!existing) {
        responseReturn(res, 200, {
          message: "Vrient Not foind",
        });
      }

      if (isVarient === true) {
        console.log("isVarient", isVarient);

        const existing = await productModel.findById(productId);
        if (!existing) {
          responseReturn(res, 200, {
            message: "Product Not foind",
          });
        }

        const updated = await productModel.findByIdAndUpdate(
          productId,
          {
            category,
            subcategory,
            type,
            name,
            stock,
            brand,
            price,
            discount,
            discountedPrice,
            description,
            color,
            colorCode,
            slug,
            ...dynamicFields,
          },
          { new: true }
        );

        const updatedProduct = await productModel.findById(productId);

        if (updatedProduct.variations && updatedProduct.variations.length > 0) {
          const variantId = updatedProduct.variations[0];

          await ProductDetailsModel.findByIdAndUpdate(
            variantId,
            {
              category,
              subcategory,
              type,
              name,
              stock,
              brand,
              price,
              discount,
              discountedPrice,
              description,
              color,
              colorCode,
              slug,
              ...dynamicFields,
            },
            { new: true }
          );
        }
      } else {
        console.log("isVarient", isVarient);
        const updated = await ProductDetailsModel.findByIdAndUpdate(
          varientId,
          {
            category,
            subcategory,
            type,
            name,
            stock,
            brand,
            price,
            discount,
            discountedPrice,
            description,
            color,
            colorCode,
            slug,
            ...dynamicFields,
          },
          { new: true }
        );
      }

      const varient = await ProductDetailsModel.findById(varientId);
      responseReturn(res, 200, { varient, message: "varient update success" });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  product_image_update = async (req, res) => {
    const { oldImage, newImage, productId } = req.body;
    try {
      if (!newImage) {
        responseReturn(res, 404, { error: "image upload failed" });
      } else {
        let { images } = await productModel.findById(productId);
        const index = images.findIndex((img) => img === oldImage);
        images[index] = newImage;

        await productModel.findByIdAndUpdate(productId, {
          images,
        });

        const product = await productModel.findById(productId);
        responseReturn(res, 200, {
          product,
          message: "product image update success",
        });
      }
    } catch (error) {
      responseReturn(res, 404, { error: error.message });
    }
  };

  product_varient_image_update = async (req, res) => {
    const { oldImage, newImage, varientId } = req.body;
    try {
      if (!newImage) {
        responseReturn(res, 404, { error: "image upload failed" });
      } else {
        let { images } = await ProductDetailsModel.findById(varientId);
        const index = images.findIndex((img) => img === oldImage);
        images[index] = newImage;

        await ProductDetailsModel.findByIdAndUpdate(varientId, {
          images,
        });

        const product = await ProductDetailsModel.findById(varientId);
        responseReturn(res, 200, {
          product,
          message: "product varient image update success",
        });
      }
    } catch (error) {
      responseReturn(res, 404, { error: error.message });
    }
  };

  addVariants = async (req, res) => {
    const { id } = req;
    const chek = req.body;

    console.log("chek", chek);

    try {
      const fields = await filteroptionModel.find({});
      let allOptions = [];
      fields.forEach((field) => {
        if (field.options && field.options.length > 0) {
          allOptions = [...allOptions, ...field.options];
        }
      });
      const uniqueOptions = [...new Set(allOptions)];

      let dynamicFields = {};
      uniqueOptions.forEach((fieldName) => {
        if (chek[fieldName] !== undefined) {
          dynamicFields[fieldName] = chek[fieldName];
        }
      });

      // Destructure static fields
      let {
        productId,
        type,
        name,
        category,
        subcategory,
        description,
        stock,
        price,
        discount,
        discountedPrice,
        shopName,
        brand,
        free_delivery,
        imageUrls,
        color,
        colorCode,
      } = req.body;

      const baseProduct = await productModel.findById(productId);
      if (!baseProduct) {
        responseReturn(res, 400, { message: "product not found", status: 400 });
      }

      // Validation
      if (!name || !category || !subcategory || !type || !stock || !price) {
        return responseReturn(res, 400, {
          message: "please provide details correctly",
        });
      }
      if (!imageUrls || imageUrls.length === 0) {
        return responseReturn(res, 400, {
          message: "At least one image is required",
        });
      }

      // Create slug
      name = name.trim();
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-");

      const variant = await ProductDetailsModel.create({
        sellerId: id,
        productId,
        type,
        name,
        slug,
        shopName,
        subcategory,
        category,
        description: description.trim(),
        price: parseInt(price),
        discount: parseInt(discount),
        discountedPrice,
        stock,
        color,
        colorCode,
        free_delivery,
        brand: brand.trim(),
        images: imageUrls,
        ...dynamicFields,
      });

      // Push variant ID to productModel
      if (variant) {
        await productModel.findOneAndUpdate(
          { _id: productId },
          {
            $addToSet: {
              variations: variant._id,
            },
          },
          { new: true }
        );
      }

      return responseReturn(res, 200, {
        variant,
        message: "Varient Added successfully",
      });
    } catch (error) {
      console.log(error.message, "error");
      responseReturn(res, 500, { error: error.message });
    }
  };

  addSponsorship = async (req, res) => {
    try {
      const { productId } = req.params;
      const { sponsoredId } = req.body;

      if (sponsoredId) {
        const sponsor = await productModel.findOneAndUpdate(
          { _id: productId },
          {
            //push variant Id here to variations field if it is not present
            $addToSet: {
              sponsors: sponsoredId,
            },
          },
          { new: true }
        );

        // console.log(productId);
        if (sponsor) {
          console.log(
            "sponsor successfully added to product sponsorlist:",
            sponsor
          );
          responseReturn(res, 201, {
            message: "sponsor added successfully",
            sponsor,
          });
        } else {
          console.log("Product not found or update failed.");
          responseReturn(res, 400, {
            message: "sponsor add operation failed ",
          });
        }
      }
      responseReturn(res, 400, {
        error: "please provide sponsor id",
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  getDetailsWithVariants = async (req, res) => {
    const { productId } = req.params;

    try {
      // Find the product by its ID and populate the variations field
      const productDetails = await productModel
        .findById(productId)
        .populate({
          path: "variations",
          model: "variants",
        })
        .select("-createdAt -updatedAt -__v");

      if (productDetails) {
        responseReturn(res, 200, {
          message: "Product details retrieved successfully",
          data: productDetails,

          status: 200,
        });
      } else {
        responseReturn(res, 200, { status: 404, message: "Product not found" });
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      responseReturn(res, 500, {
        message: "Internal Server Error",
        error: error.message,
      });
    }
  };

  /**`
   *
   * @ANDROID
   *
   */
  getDetailsWithVariantsForAndroid = async (req, res) => {
    const { productId } = req.params;

    try {
      const productDetails = await productModel
        .findById(productId)
        .populate({
          path: "variations",
          model: "variants",
        })
        .select("-createdAt -updatedAt -__v");

      // console.log("productDetails", productDetails);

      // return;

      const sponsors = await productModel.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(productId) },
        },

        {
          $lookup: {
            from: "products",
            localField: "sponsors",
            foreignField: "_id",
            as: "sponsorDetails",
          },
        },

        {
          $project: {
            _id: 0,
            sponsors: {
              $map: {
                input: "$sponsorDetails",
                as: "sponsor",
                in: {
                  image: { $arrayElemAt: ["$$sponsor.images", 0] }, // First image
                  brand: "$$sponsor.brand",
                  price: "$$sponsor.price",
                  discount: "$$sponsor.discount",
                  name: "$$sponsor.name",
                },
              },
            },
          },
        },
      ]);

      const relatedProducts = await productModel.aggregate([
        {
          $match: {
            $and: [
              {
                _id: {
                  $ne: productDetails._id,
                },
              },
              {
                category: {
                  $eq: productDetails.category,
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
                  $ne: productId,
                },
              },
              {
                sellerId: {
                  $eq: productDetails.sellerId,
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

      if (productDetails) {
        responseReturn(res, 200, {
          message: "Product details retrieved successfully",
          data: {
            productDetails: {
              ...productDetails._doc,
              variations: productDetails.variations,
            },
            relatedProducts,
            moreProducts,
            sponsors: sponsors[0].sponsors,
          },
          status: 200,
        });
      } else {
        responseReturn(res, 200, { status: 404, message: "Product not found" });
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      responseReturn(res, 500, {
        message: "Internal Server Error",
        error: error.message,
      });
    }
  };

  addFilter = async (req, res) => {
    const { productType } = req.body;
    const trimproductType = productType.trim();

    const filter = await filteroptionModel.create({
      productType: trimproductType,
    });
    if (!filter) {
      responseReturn(res, 400, {
        message: "filter creation failed",
        status: 400,
      });
    }
    responseReturn(res, 200, {
      message: "filter created",
      status: 201,
    });
  };
  addFilterOptions = async (req, res) => {
    const { productTypeId, productType, options } = req.body;

    try {
      const filter = await filteroptionModel.findOneAndUpdate(
        { _id: productTypeId },
        {
          $set: {
            productType,
            options,
          },
        },
        { new: true, upsert: true }
      );

      // await createDynamicProductSchema();
      initProductModel();

      return res.status(200).json({
        message: "Product type and options updated successfully",
        filter,
      });
    } catch (error) {
      return res.status(500).json({
        error: error.message,
      });
    }
  };

  get_product_type = async (req, res) => {
    const { productTypeId } = req.params;
    try {
      const getproductType = await filteroptionModel.findById(productTypeId);
      responseReturn(res, 200, {
        getproductType,
        status: 201,
      });
    } catch (error) {
      responseReturn(res, 500, {
        message: "Internal server error",
        status: 500,
      });
    }
  };

  delete_product_type = async (req, res) => {
    const { productTypeId } = req.params;
    try {
      const category = await filteroptionModel.findByIdAndDelete(productTypeId);
      if (!category) {
        throw new Error("Product Type not found");
      }

      responseReturn(res, 200, {
        message: "Product Type deleted successfully",
      });
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 500, { message: error.message });
    }
  };

  get_search_item = async (req, res) => {
    const { searchValue } = req.params;
    const { id } = req;
    const decodedSearchValue = decodeURIComponent(searchValue).trim();

    try {
      const regex = new RegExp(`^${decodedSearchValue}$`, "i");
      const product = await productModel.find({
        sellerId: id,
        name: { $regex: regex },
      });

      if (product.length === 0) {
        return res.status(200).json({ message: "No products found" });
      }

      console.log("Matched Products:", product);
      responseReturn(res, 200, { product });
    } catch (error) {
      console.log("Search Error:", error.message);
      res
        .status(500)
        .json({ message: "Server error while searching products." });
    }
  };
}

module.exports = new productController();
