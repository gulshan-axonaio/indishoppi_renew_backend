const router = require("express").Router();
const {
  userPhoneLogout,
  sendLoginPhoneOTP,
  verifyLoginPhoneOtp,
  verifyRegisterationPhoneOtp,
  registerUser,
  setPassword,
  resetPasswordSendOtp,
  resendPhoneOtp,
  changePassword,
  resetPasswordVerifyOtp,
} = require("../../controllers/android/android_user_auth_controller");
const customerAuthController = require("../../controllers/home/customerAuthController");
const { customerMiddleware } = require("../../middlewares/authMiddleware");
// const upload = require("../../utils/multerConfig");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
/**
 *
 *                      @FOR_WEB
 */

router.post(
  "/customer/customer-register",
  customerAuthController.customer_register
);

router.post("/customer/customer-login", customerAuthController.customer_login);
router.get("/customer/logout", customerAuthController.customer_logout);

/**
 *
 *                      @FOR_ANDROID
 */

//____________ LOGIN ___________

router.post("/logout", userPhoneLogout);
router.post("/login/send-otp", sendLoginPhoneOTP);
router.post("/login/verify-otp", verifyLoginPhoneOtp);

//____________REGISTER ___________
router.post("/send-otp", registerUser);
router.post("/register/verify-otp", verifyRegisterationPhoneOtp);
// router.post("/set-password", setPassword);

//____________ PASSWORD ___________
router.post("/resend-otp", resendPhoneOtp);
router.post("/reset-password", resetPasswordSendOtp);
router.post("/change-password", changePassword);
router.post("/reset-password-verify", resetPasswordVerifyOtp);

router.get("/profile", customerMiddleware, customerAuthController.get_details);
router.post("/single-user-login", customerAuthController.single_user_login);

router.post(
  "/profile/edit",
  upload.single("image"),
  customerMiddleware,
  customerAuthController.update_details
);
module.exports = router;
