const router = require("express").Router();

const {
  attachKeys,
  getKeys,
} = require("../../controllers/dashboard/keyscontroller.js");

const {
  authMiddleware,
  customerMiddleware,
} = require("../../middlewares/authMiddleware");

// router.post("/admin/attach-keys", authMiddleware, attachKeys);
router.get("/admin/fetch-keys", customerMiddleware, getKeys);

module.exports = router;
