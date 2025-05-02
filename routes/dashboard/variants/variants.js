const variantRouter = require("express").Router();
const { authMiddleware } = require("../../../middlewares/authMiddleware");
const productController = require("../../../controllers/dashboard/productController");

variantRouter.get(
  "/product/variants/:productId",

  productController.getDetailsWithVariants
);
variantRouter.post(
  "/product/variants",
  authMiddleware,
  productController.addVariants
);

/**
 *
 * @ANDROID
 *
 */

variantRouter.get(
  "/android/product/variants/:productId",
  productController.getDetailsWithVariantsForAndroid
);
module.exports = variantRouter;
