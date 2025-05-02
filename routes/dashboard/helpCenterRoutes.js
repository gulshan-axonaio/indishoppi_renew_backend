const router = require("express").Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const helpCenterController = require("../../controllers/dashboard/helpCenterController");

router.post(
  "/faq-category-add",
  authMiddleware,
  helpCenterController.faq_category_add
);

router.get(
  "/customer-get-faq-category",
  helpCenterController.customer_get_faq_category
);

// faq sub category

router.post(
  "/faq-subcategory-add",
  authMiddleware,
  helpCenterController.faq_subcategory_add
);

router.post(
  "/customer-get-faq-subcategory-bycategory",
  helpCenterController.customer_get_faq_subcategory_bycategory
);

module.exports = router;
