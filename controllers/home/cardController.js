const cardModel = require("../../models/cardModel");
const saveListModel = require("../../models/saveListModel");
const wishlistModel = require("../../models/wishlistModel");
const { responseReturn } = require("../../utiles/response");
const {
  mongo: { ObjectId },
} = require("mongoose");
const createDynamicProductSchema = require("../../models/productModel");
const createDynamicVariantSchema = require("../../models/productDetailsModel");
let productModel = null;
let ProductDetailsModel = null;

const initProductModel = async () => {
  productModel = await createDynamicProductSchema();
  ProductDetailsModel = await createDynamicVariantSchema();
};
initProductModel();
class cardController {
  add_to_card = async (req, res) => {
    const { productId, quantity, variantId, size } = req.body;

    const userId = req.id;
    try {
      const sellerIdData = await productModel
        .findById(productId)
        .select("sellerId -_id")
        .lean()
        .exec();

      const sellerId = sellerIdData.sellerId;

      const product = await cardModel.findOne({
        $and: [
          {
            variantId: {
              $eq: variantId,
            },
          },
          {
            productId: {
              $eq: productId,
            },
          },
          {
            userId: {
              $eq: userId,
            },
          },
        ],
      });
      if (product) {
        return responseReturn(res, 200, {
          error: "Product already added to card",
          status: 400,
        });
      }
      const myProduct = await ProductDetailsModel.findOne({
        $and: [{ productId: productId }, { _id: variantId }],
      });
      if (!myProduct) {
        responseReturn(res, 200, {
          message: "product not found ",
          status: 404,
        });
      }
      // console.log(myProduct);

      if (myProduct.size.indexOf(size) == -1) {
        return responseReturn(res, 200, {
          message: "size not available",
          status: 400,
        });
      }

      const createdCart = await cardModel.create({
        userId,
        productId,
        quantity,
        variantId,
        sellerId,
        size,
      });

      responseReturn(res, 200, {
        message: "Add to card success",
        cart: createdCart,
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  web_add_to_card = async (req, res) => {
    const { productId, quantity } = req.body;

    const userId = req.id;
    try {
      const sellerIdData = await productModel
        .findById(productId)
        .select("sellerId -_id")
        .lean()
        .exec();

      const sellerId = sellerIdData.sellerId;

      const product = await cardModel.findOne({
        $and: [
          {
            productId: {
              $eq: productId,
            },
          },
          {
            userId: {
              $eq: userId,
            },
          },
        ],
      });
      if (product) {
        return responseReturn(res, 200, {
          error: "Product already added to card",
          status: 400,
        });
      }

      const createdCart = await cardModel.create({
        userId,
        productId,
        quantity,
        sellerId,
      });

      responseReturn(res, 200, {
        message: "Add to card success",
        cart: createdCart,
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  //_________________________ fetch cart Products _______________________
  get_card_products = async (req, res) => {
    const co = 5;
    const userId = req.id;

    console.log("userId", userId);

    try {
      const card_products = await cardModel.aggregate([
        {
          $match: {
            userId: {
              $eq: new ObjectId(userId),
            },
          },
        },
        {
          $lookup: {
            from: "variants",
            localField: "variantId",
            foreignField: "_id",
            as: "products",
          },
        },
      ]);

      if (card_products.length < 1) {
        responseReturn(res, 200, {
          message: "cart is empty ",
          status: 200,
        });
      }

      let buy_product_item = 0;
      let calculatePrice = 0;
      let card_product_count = 0;
      const outOfStockProduct = card_products.filter((p) => {
        p.products[0]?.stock < p.quantity;
      });

      for (let i = 0; i < outOfStockProduct.length; i++) {
        card_product_count = card_product_count + outOfStockProduct[i].quantity;
      }

      console.log("card_products", card_products);

      const stockProduct = card_products.filter(
        (p) => p.products[0].stock >= p.quantity
      );
      console.log(stockProduct);
      // return res.send(stockProduct);
      for (let i = 0; i < stockProduct.length; i++) {
        const { quantity } = stockProduct[i];
        card_product_count = card_product_count + quantity;
        buy_product_item = buy_product_item + quantity;
        const { price, discount } = stockProduct[i].products[0];
        console.log(price, discount);
        stockProduct[i].products[0].discountedPrice = Math.round(
          price - (price * discount) / 100
        );

        if (discount !== 0) {
          calculatePrice =
            calculatePrice +
            quantity * (price - Math.round((price * discount) / 100));
        } else {
          calculatePrice = calculatePrice + quantity * price;
        }
      }
      console.log("calculatePrice===> ", calculatePrice);

      let p = [];
      let unique = [
        ...new Set(stockProduct.map((p) => p.products[0]?.sellerId.toString())),
      ];

      //_________ below lines creating the problem
      for (let i = 0; i < unique.length; i++) {
        let price = 0;
        for (let j = 0; j < stockProduct.length; j++) {
          const tempProduct = stockProduct[j].products[0];
          if (unique[i] === tempProduct.sellerId.toString()) {
            let pri = 0;
            if (tempProduct.discount !== 0) {
              pri =
                tempProduct.price -
                Math.floor((tempProduct.price * tempProduct.discount) / 100);
            } else {
            }
            pri = tempProduct.price;
            pri = pri - Math.round((pri * co) / 100);
            price = price + pri * stockProduct[j].quantity;

            console.log("stockProduct", stockProduct[j]);

            p[i] = {
              sellerId: unique[i],
              shopName: tempProduct.shopName,
              // ___________i have changed below one line_________
              price: calculatePrice,

              products: p[i]
                ? [
                    ...p[i].products,
                    {
                      _id: stockProduct[j]._id,
                      quantity: stockProduct[j].quantity,
                      productInfo: {
                        ...tempProduct,
                        size: stockProduct[j].size,
                      },
                    },
                  ]
                : [
                    {
                      _id: stockProduct[j]._id,
                      quantity: stockProduct[j].quantity,
                      productInfo: {
                        ...tempProduct,
                        size: stockProduct[j].size,
                      },
                    },
                  ],
            };
          }
        }
      }

      responseReturn(res, 200, {
        data: {
          card_products: p,
          cartId: card_products[0]._id,
          price: calculatePrice,
          card_product_count,
          // shipping_fee: 85 * p.length,
          outOfStockProduct,
          buy_product_item,
        },
        status: 200,
        message: "cart items fetched successfully",
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_card_products_android = async (req, res) => {
    const co = 5;
    const userId = req.id;
    console.log("heloo");
    try {
      const card_products = await cardModel.aggregate([
        {
          $match: {
            userId: {
              $eq: new ObjectId(userId),
            },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "products",
          },
        },
        {
          $unwind: "$products", // Flatten the products array
        },
        {
          $group: {
            _id: null, // Group all documents together
            products: { $push: "$products" }, // Collect all products into a single array
          },
        },
        {
          $project: {
            _id: 0, // Remove the _id field from the result
            products: 1, // Keep only the products array
          },
        },
      ]);

      console.log(card_products[0].products);

      // console.log("card_products===>", p);
      responseReturn(res, 200, {
        data: {
          card_products,
        },
        status: 200,
        message: "cart items fetched successfully",
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_web_cart_product = async (req, res) => {
    const co = 5;
    const userId = req.id;

    try {
      let card_products = await cardModel.aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "products",
          },
        },
        {
          $unwind: {
            path: "$products",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);

      let buy_product_item = 0;
      let calculatePrice = 0;
      let card_product_count = 0;

      // Filter out out-of-stock products
      const outOfStockProduct = card_products.filter(
        (p) => p.products && p.products.stock < p.quantity
      );

      outOfStockProduct.forEach((p) => {
        card_product_count += p.quantity;
      });

      const stockProduct = card_products.filter(
        (p) => p.products && p.products.stock >= p.quantity
      );

      stockProduct.forEach((p) => {
        const { quantity } = p;
        const { price, discount } = p.products;
        card_product_count += quantity;
        buy_product_item += quantity;

        if (discount !== 0) {
          calculatePrice +=
            quantity * (price - Math.floor((price * discount) / 100));
        } else {
          calculatePrice += quantity * price;
        }
      });

      console.log("calculatePrice===> ", calculatePrice);

      let groupedProducts = {};
      let uniqueSellers = new Set(
        stockProduct.map((p) => p.products.sellerId.toString())
      );

      uniqueSellers.forEach((sellerId) => {
        groupedProducts[sellerId] = {
          sellerId,
          shopName: stockProduct.find(
            (p) => p.products.sellerId.toString() === sellerId
          )?.products.shopName,
          price: 0,
          products: [],
        };
      });

      stockProduct.forEach((p) => {
        const tempProduct = p.products;
        const sellerId = tempProduct.sellerId.toString();

        let pri = tempProduct.discount
          ? tempProduct.price -
            Math.floor((tempProduct.price * tempProduct.discount) / 100)
          : tempProduct.price;

        pri -= Math.floor((pri * co) / 100);
        groupedProducts[sellerId].price += pri * p.quantity;

        groupedProducts[sellerId].products.push({
          _id: p._id,
          quantity: p.quantity,
          productInfo: tempProduct,
        });
      });

      const finalProducts = Object.values(groupedProducts);

      responseReturn(res, 200, {
        card_products: finalProducts,
        price: calculatePrice,
        card_product_count,
        shipping_fee: 85 * finalProducts.length,
        outOfStockProduct,
        buy_product_item,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  delete_all_card_product = async (req, res) => {
    const userId = req.id;
    try {
      const deletedItem = await cardModel.deleteMany(
        { userId: new ObjectId(userId) },
        { new: true }
      );
      console.log(deletedItem);
      responseReturn(res, 200, {
        message: "success",
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };
  delete_card_product = async (req, res) => {
    const { card_id } = req.params;
    try {
      const item = await cardModel.findByIdAndDelete(card_id, { new: true });
      if (item) {
        responseReturn(res, 200, {
          message: "success",
          status: 200,
        });
      } else {
        responseReturn(res, 200, {
          message: "item already removed",
          status: 400,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  quantity_inc = async (req, res) => {
    const { card_id } = req.params;
    try {
      const product = await cardModel.findById(card_id);
      const { quantity } = product;
      await cardModel.findByIdAndUpdate(card_id, {
        quantity: quantity + 1,
      });
      responseReturn(res, 200, {
        message: "success",
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };
  quantity_dec = async (req, res) => {
    const { card_id } = req.params;
    try {
      const product = await cardModel.findById(card_id);
      const { quantity } = product;
      const updatedCard = await cardModel.findOneAndUpdate(
        { _id: card_id, quantity: { $gt: 1 } }, // Check if quantity > 1
        { $inc: { quantity: -1 } }, // Decrement quantity by 1
        { new: true } // Return the updated document
      );
      // await cardModel.findByIdAndUpdate(card_id, {
      //   quantity: quantity - 1,
      // });
      responseReturn(res, 200, {
        message: "please increase",
        status: 400,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  /**
   *              @WISHLIST
   */
  add_wishlist = async (req, res) => {
    const { slug } = req.body;

    const userId = req.id;
    try {
      const product = await wishlistModel.findOne({
        userId,
        slug,
      });
      const myProduct = await productModel.findOne({
        slug,
      });
      if (product) {
        responseReturn(res, 200, {
          message: "item Allready added",
          status: 400,
        });
      } else {
        if (!myProduct) {
          responseReturn(res, 200, {
            message: "item not found",
            status: 404,
          });
        }

        const wishlist = await wishlistModel.create({
          userId: req.id,
          productId: myProduct._id,
          name: myProduct.name,
          slug,

          price: myProduct.price,
          discount: myProduct.discount,
          image: myProduct?.images[0],
          rating: myProduct.rating,
        });
        responseReturn(res, 200, {
          message: "add to wishlist success",
          wishlist,
          status: 200,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  get_wishlist = async (req, res) => {
    const userId = req.id;
    console.log(userId);
    try {
      const wishlists = await wishlistModel
        .find({
          userId,
        })
        .select("name price discount image rating slug productId");
      responseReturn(res, 200, {
        wishlistCount: wishlists.length,
        wishlists,
        status: 200,
        message: "wishlist fetched ",
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  delete_wishlist = async (req, res) => {
    const { wishlistId } = req.params;
    try {
      const wishlist = await wishlistModel.findByIdAndDelete(wishlistId, {
        new: true,
      });
      if (wishlist) {
        responseReturn(res, 200, {
          message: "Remove success",
          wishlistId,
        });
      } else {
        responseReturn(res, 200, {
          message: "product is already removed ",
          status: 200,
          wishlistId,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  delete_wishlist_product = async (req, res) => {
    const { productId } = req.params;
    const userId = req.id;
    try {
      const wishlist = await wishlistModel.findOneAndDelete(
        { userId, productId },
        {
          new: true,
        }
      );
      if (wishlist) {
        responseReturn(res, 200, {
          message: "Remove success",
          data: productId,
          status: 200,
        });
      } else {
        responseReturn(res, 200, {
          message: "product is already removed ",
          status: 200,
          data: productId,
        });
      }
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 200, {
        message: "server error ",
        status: 500,
      });
    }
  };

  /**
   *
   *
   *               @ANDROID
   *
   *
   */

  delete_card_product_android = async (req, res) => {
    const { card_id } = req.params;
    try {
      const item = await cardModel.findByIdAndDelete(card_id, { new: true });
      if (item) {
        responseReturn(res, 200, {
          message: "success",
          status: 200,
        });
      } else {
        responseReturn(res, 200, {
          message: "item already removed",
          status: 400,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  quantity_inc_android = async (req, res) => {
    const { card_id } = req.params;
    try {
      const product = await cardModel.findById(card_id);
      const { quantity } = product;
      await cardModel.findByIdAndUpdate(card_id, {
        quantity: quantity + 1,
      });
      responseReturn(res, 200, {
        message: "success",
      });
    } catch (error) {
      console.log(error.message);
    }
  };
  quantity_dec_android = async (req, res) => {
    const { card_id } = req.params;
    try {
      const product = await cardModel.findById(card_id);
      await cardModel.findOneAndUpdate(
        { _id: card_id, quantity: { $gt: 1 } }, // Check if quantity > 1
        { $inc: { quantity: -1 } }, // Decrement quantity by 1
        { new: true } // Return the updated document
      );
      responseReturn(res, 200, {
        message: "success",
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  move_to_savelist = async (req, res) => {
    const { productId, quantity, variantId, size } = req.body;
    const userId = req.id;
    try {
      await cardModel.findOneAndDelete({
        $and: [
          {
            variantId: {
              $eq: variantId,
            },
          },
          {
            productId: {
              $eq: productId,
            },
          },
          {
            userId: {
              $eq: userId,
            },
          },
        ],
      });

      const myProduct = await ProductDetailsModel.findOne({
        $and: [{ productId: productId }, { _id: variantId }],
      });

      // console.log(myProduct);

      if (myProduct.size.indexOf(size) == -1) {
        return responseReturn(res, 200, {
          message: "size not available",
          status: 400,
        });
      }

      const product = await saveListModel.create({
        userId,
        productId,
        quantity,
        variantId,
        size,
      });

      responseReturn(res, 200, {
        message: "Move to savelist success",
        product,
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  //_________________________ fetch cart Products _______________________
  get_savelist_products = async (req, res) => {
    const co = 5;
    const userId = req.id;

    try {
      const savedlist = await saveListModel.aggregate([
        {
          $match: {
            userId: {
              $eq: new ObjectId(userId),
            },
          },
        },
        {
          $lookup: {
            from: "variants",
            localField: "variantId",
            foreignField: "_id",
            as: "products",
          },
        },
      ]);

      if (savedlist.length < 1) {
        responseReturn(res, 200, {
          message: "save list is empty ",
          status: 200,
        });
      }
      const stockProduct = savedlist
        .filter((p) => p.products[0]?.stock >= p.quantity)
        .map((p) => ({
          selectedSize: p.size,
          productDetails: p.products[0],
        }));

      responseReturn(res, 200, {
        data: stockProduct,
        status: 200,
        message: "saved items fetched successfully",
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  move_from_savelist_to_cart = async (req, res) => {
    const { productId, quantity, variantId, size } = req.body;
    const userId = req.id;
    try {
      await saveListModel.findOneAndDelete({
        $and: [
          {
            variantId: {
              $eq: variantId,
            },
          },
          {
            productId: {
              $eq: productId,
            },
          },
          {
            userId: {
              $eq: userId,
            },
          },
        ],
      });

      const myProduct = await ProductDetailsModel.findOne({
        $and: [{ productId: productId }, { _id: variantId }],
      });

      // console.log(myProduct);

      if (myProduct.size.indexOf(size) == -1) {
        return responseReturn(res, 200, {
          message: "size not available",
          status: 400,
        });
      }

      const product = await cardModel.create({
        userId,
        productId,
        quantity,
        variantId,
        size,
      });

      responseReturn(res, 200, {
        message: "Move to cart success",
        product,
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  remove_from_savelist = async (req, res) => {
    const { productId, variantId } = req.body;
    const userId = req.id;
    try {
      const product = await saveListModel.findOneAndDelete(
        {
          $and: [
            {
              variantId: {
                $eq: variantId,
              },
            },
            {
              productId: {
                $eq: productId,
              },
            },
            {
              userId: {
                $eq: userId,
              },
            },
          ],
        },
        { new: true }
      );

      responseReturn(res, 200, {
        message: "remove from savelist success",
        product,
        status: 200,
      });
    } catch (error) {
      console.log(error.message);
    }
  };
}
module.exports = new cardController();
