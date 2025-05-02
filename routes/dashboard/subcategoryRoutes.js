const router = require("express").Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const subCategoryController = require("../../controllers/dashboard/subCategoryController");

router.post(
  "/sub-category-add",
  authMiddleware,
  subCategoryController.add_sub_category
);

router.get(
  "/get_sub_cat_by_category/:categoryId",

  subCategoryController.get_sub_cat_by_category
);

router.get(
  "/sub_category-get",

  subCategoryController.get_sub_category
);
router.get(
  "/get-one-subCategory/:subCategoryId",

  subCategoryController.get_one_sub_category
);
router.delete(
  "/sub-category-delete/:subCategoryId",
  authMiddleware,
  subCategoryController.delete_sub_category
);
router.post(
  "/sub-category-update",
  authMiddleware,
  subCategoryController.sub_category_update
);
router.post(
  "/sub-category-image-update",
  authMiddleware,
  subCategoryController.sub_category_image_update
);

module.exports = router;
