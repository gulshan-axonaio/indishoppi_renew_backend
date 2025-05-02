const router = require("express").Router();

const bannerController = require("../controllers/bannerController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/createbanner", bannerController.add_banner);
router.get(
  "/getallbannerItems",
  authMiddleware,
  bannerController.get_banner_Items
);

module.exports = router;
