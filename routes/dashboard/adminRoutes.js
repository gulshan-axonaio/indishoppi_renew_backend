const { authMiddleware } = require("../../middlewares/authMiddleware");
const couponsController = require("../../controllers/dashboard/couponsController");
const router = require("express").Router();

router.post("/coupons/add", authMiddleware, couponsController.add_coupons);
router.post("/coupons/:id", authMiddleware, couponsController.delete_coupon);


module.exports = router;
