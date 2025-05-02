const router = require("express").Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const productController = require("../../controllers/dashboard/productController");

router.post("/product-add", authMiddleware, productController.add_product);
router.get("/products-get", authMiddleware, productController.products_get);
router.get("/product-types", authMiddleware, productController.product_types);
router.post(
  "/fetch_product_byId",
  authMiddleware,
  productController.fetch_product_byId
);
router.get(
  "/product-get/:productId",
  authMiddleware,
  productController.product_get
);
router.get(
  "/get-pickup-location/:locationId",
  authMiddleware,
  productController.get_pickup_location
);

router.get("/product-detail", productController.product_detail);

router.get(
  "/related-product-get/:productId",

  productController.related_products
);

router.delete(
  "/product-delete/:productId",
  authMiddleware,
  productController.product_delete
);
router.post(
  "/product-update",
  authMiddleware,
  productController.product_update
);

router.post(
  "/product-varient-update",
  authMiddleware,
  productController.product_varient_update
);

router.post(
  "/product-image-update",
  authMiddleware,
  productController.product_image_update
);

router.post(
  "/product_varient_image_update",
  authMiddleware,
  productController.product_varient_image_update
);

/**
 *
 *
 *   @ANDROID
 *
 */

router.post("/product/sponsor/:productId", productController.addSponsorship);
router.post(
  "/filter-options",
  authMiddleware,
  productController.addFilterOptions
);
router.post("/filter", authMiddleware, productController.addFilter);

router.get(
  "/get-product-type/:productTypeId",
  authMiddleware,
  productController.get_product_type
);
router.delete(
  "/delete-product-type/:productTypeId",
  authMiddleware,
  productController.delete_product_type
);

module.exports = router;
