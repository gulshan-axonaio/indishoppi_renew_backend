const router = require("express").Router();
const couponsController = require("../../controllers/dashboard/couponsController");
const homeControllers = require("../../controllers/home/homeControllers");
const {
  searchMiddleware,
  customerMiddleware,
} = require("../../middlewares/authMiddleware");
/**
 *          @FOR_WEB
 */
router.get("/get-categorys", homeControllers.get_categorys);
router.get(
  "/home-page-product-listing",
  homeControllers.home_page_product_listing
);
router.get("/get-products", homeControllers.get_products);
router.get("/get-product/:slug", homeControllers.get_product);
router.get("/price-range-latest-product", homeControllers.price_range_product);
router.get("/query-products", searchMiddleware, homeControllers.query_products);
router.get(
  "/recent-searches",
  customerMiddleware,
  homeControllers.get_recent_searches
);
router.post("/customer/submit-review", homeControllers.submit_review);
router.get("/customer/get-reviews/:varientId", homeControllers.get_reviews);

/**
 *          @FOR_ANDROID
 */

router.get("/all", homeControllers.getEverything);

router.get(
  "/product/search/:search",
  searchMiddleware,
  homeControllers.searchProducts
);
router.get("/product/suggest-search/:search", homeControllers.suggestSearch);

router.get("/allproducts", homeControllers.allProducts);
router.get("/allsubcats", homeControllers.allSubcategorys);
router.get("/products", homeControllers.fetchBySubcat);
router.post("/coupons/get", couponsController.get_coupons);
router.post("/coupons/apply", couponsController.apply_coupon);

router.get("/category-list", homeControllers.categoryList);
/**
 *
 *
 *   @ANDROID
 *
 */

router.get("/filter-options/:productType", homeControllers.getFilterOptions);
router.get("/filter-values", homeControllers.getFilterValues);

router.get("/filter-products", homeControllers.getFilterProducts);

module.exports = router;
