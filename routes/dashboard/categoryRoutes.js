const router = require("express").Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const categoryController = require("../../controllers/dashboard/categoryController");
/**
 *
 *            FEATURED CATEGORYS
 *
 */

router.post(
  "/featured-category",
  // authMiddleware,
  categoryController.add_featured_category
);
router.post(
  "/featured-category/:featuredId",
  // authMiddleware,
  categoryController.add_cats_to_featured_category
);
router.get(
  "/featured-category/:slug",
  // authMiddleware,
  categoryController.get_featured_category
);

router.get(
  "/featured-categorys",
  // authMiddleware,
  categoryController.get_featured_categorys
);

// New category
router.get(
  "/newcategory-list",
  // authMiddleware,
  categoryController.new_category_list
);

router.post(
  "/new-subcategory-list",
  // authMiddleware,
  categoryController.new_getsubcategoryByCategory
);

// ________________________________________________________
router.post("/category-add", authMiddleware, categoryController.add_category);

router.get("/category-get", categoryController.get_category);

router.get(
  "/get-one-category/:categoryId",

  categoryController.get_one_category
);
router.delete(
  "/category-delete/:categoryId",
  authMiddleware,
  categoryController.delete_category
);
router.post(
  "/category-update",
  authMiddleware,
  categoryController.category_update
);
router.post(
  "/category-image-update",
  authMiddleware,
  categoryController.category_image_update
);

router.get("/get-filter-option-new", categoryController.get_filter_option_new);
router.get("/get_productype", categoryController.get_productype);

module.exports = router;
