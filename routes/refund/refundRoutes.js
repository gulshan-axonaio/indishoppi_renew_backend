const router = require("express").Router();
const {
  do_refund,
  process_refund,
} = require("../../controllers/refund/refundController.js");
const {
  customerMiddleware,
  authMiddleware,
} = require("../../middlewares/authMiddleware");

// ---- customer
router.post("/home/refund/:orderId", customerMiddleware, do_refund);

router.post(
  "/home/process-refund/:orderId",
  customerMiddleware,
  process_refund
);

module.exports = router;
