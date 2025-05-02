const router = require("express").Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const authControllers = require("../controllers/authControllers");

router.post("/admin-login", authControllers.admin_login);
router.post("/admin-register", authControllers.admin_register);

router.get("/get-user", authMiddleware, authControllers.getUser);
router.post("/seller-register", authControllers.seller_register);
// router.post("/seller-kyc-details", authControllers.seller_kyc_registration);
// router.post("/seller-document-upload", authControllers.seller_document_upload);
router.post("/seller-login", authControllers.seller_login);
router.post("/verify-otp", authControllers.verify_otp);
router.post(
  "/profile-image-upload",
  authMiddleware,
  authControllers.profile_image_upload
);
router.post(
  "/profile-info-add",
  authMiddleware,
  authControllers.profile_info_add
);

router.post(
  "/pickup-location-add",
  authMiddleware,
  authControllers.pickup_location_add
);

router.post(
  "/shiprocket-account-add",
  authMiddleware,
  authControllers.shiprocket_account_add
);

router.post(
  "/add-pickup-location-shiprocket",
  authMiddleware,
  authControllers.add_pickup_location_shiprocket
);

router.post(
  "/pickup-location-update",
  authMiddleware,
  authControllers.pickup_location_update
);

router.get("/logout", authControllers.logout);

module.exports = router;
