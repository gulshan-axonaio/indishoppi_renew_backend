const router = require("express").Router();
const customerOrderController = require("../../controllers/dashboard/customerOrderController");
const {
  customerMiddleware,
  authMiddleware,
} = require("../../middlewares/authMiddleware");

// ---- customer
router.post(
  "/order/create",
  customerMiddleware,
  customerOrderController.create_order
);
router.get(
  "/generate-android-invoice/:orderId",

  customerOrderController.generate_android_invoice
);
router.post("/orders", customerMiddleware, customerOrderController.get_orders);
router.post(
  "/order/details/:orderId",
  customerMiddleware,
  customerOrderController.get_orderDetails
);

router.post(
  "/order/:id",
  customerMiddleware,
  customerOrderController.get_order
);

router.delete(
  "/order/:id",
  customerMiddleware,
  customerOrderController.delete_order
);
router.post(
  "/order/cart/android",
  customerMiddleware,
  customerOrderController.create_cart_order
);

router.post(
  "/remove-cart-success",
  customerMiddleware,
  customerOrderController.remove_cart_success
);

router.post(
  "/home/order/update-order-status/:orderId",
  customerMiddleware,
  customerOrderController.update_order_status
);

module.exports = router;
