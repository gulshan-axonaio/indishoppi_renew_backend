const Coupon = require("../../models/couponModel.js");
const { responseReturn } = require("../../utiles/response.js");
const moment = require("moment");
class couponsController {
  add_coupons = async (req, res) => {
    const { code, type, value, expiryDate, description, upto } = req.body;

    // Validate request data
    if (!code || !type || !value || !expiryDate || !description) {
      return res
        .status(200)
        .json({ message: "All fields are required.", status: 400 });
    }

    try {
      const parsedDate = new Date(expiryDate);
      if (isNaN(parsedDate.getTime())) {
        return res
          .status(400)
          .json({ message: "Invalid expiry date format. Use YYYY-MM-DD." });
      }
      // Check if coupon code already exists
      const existingCoupon = await Coupon.findOne({ code });
      if (existingCoupon) {
        return res
          .status(200)
          .json({ message: "Coupon code already exists.", status: 400 });
      }

      // Create new coupon
      const expiryDateObject = moment(
        expiryDate,
        "DD MMMM YYYY, hh:mm A"
      ).toDate();
      const newCoupon = new Coupon({
        code,
        type,
        value,
        expiryDate: expiryDateObject,
        description,
        upto,
      });

      // Save coupon to database
      const savedCoupon = await newCoupon.save();
      savedCoupon.expiryDate = moment(savedCoupon.expiryDate).format(
        "DD MMMM YYYY, hh:mm A"
      );
      return res.status(200).json({
        message: "Coupon added successfully.",
        status: 200,
        coupon: savedCoupon,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  get_coupon_details = async (req, res) => {
    const { id } = req.params;

    try {
      const coupon = await Coupon.findById(id);

      if (!coupon) {
        responseReturn(res, 200, {
          message: "coupon not found",
          status: 404,
        });
      }

      responseReturn(res, 200, {
        coupon,
        message: "coupon fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
  get_coupons = async (req, res) => {
    try {
      const coupons = await Coupon.find();

      const formattedCoupons = coupons.map((coupon) => ({
        ...coupon.toObject(), // Convert Mongoose document to plain JS object
        expiryDate: moment(coupon.expiryDate).format("DD MMMM YYYY, hh:mm A"), // Format expiryDate
      }));
      responseReturn(res, 200, {
        coupons: formattedCoupons,
        message: "coupons fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
  delete_coupon = async (req, res) => {
    const { id } = req.params;

    try {
      // Validate coupon ID
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        return responseReturn(res, 200, {
          message: "coupon not found",
          status: 400,
        });
      }

      // Delete coupon
      await Coupon.findByIdAndDelete(id);
      responseReturn(res, 200, {
        coupon,
        message: "coupons deleted successfully",
        status: true,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  apply_coupon = async (req, res) => {
    try {
      const { productPrice, couponCode } = req.body;

      // Validate input
      if (!productPrice || !couponCode) {
        return res.status(200).json({
          message: "Product price and coupon code are required.",
          status: 400,
        });
      }

      // Check if the coupon exists and is active
      const coupon = await Coupon.findOne({
        code: couponCode,
        isActive: true,
        expiryDate: { $gte: new Date() }, // Ensure the coupon is not expired
      });

      if (!coupon) {
        return res.status(200).json({
          message: "Invalid or expired coupon code.",
          status: 404,
        });
      }
      // upto=500 discount = 40% price = 10000
      // Calculate discount
      let discountedPrice = productPrice;
      if (coupon.type === "price") {
        discountedPrice = productPrice - coupon.value;
      } else if (coupon.type === "discount" && coupon.upto == null) {
        discountedPrice = productPrice - (productPrice * coupon.value) / 100;
      } else if (coupon.type === "discount" && coupon.upto) {
        if (productPrice - (productPrice * coupon.value) / 100 > coupon.upto) {
          discountedPrice = coupon.upto;
        } else {
          discountedPrice = productPrice - (productPrice * coupon.value) / 100;
        }
      }

      // Ensure the discounted price is not negative
      discountedPrice = Math.max(0, discountedPrice);

      // Respond with the calculated discounted price
      return res.status(200).json({
        message: "Coupon applied successfully.",
        status: 200,
        data: {
          originalPrice: productPrice,
          appliedCoupon: couponCode,
          discountedPrice,
          discount: productPrice - discountedPrice,
        },
      });
    } catch (error) {
      console.error("Error applying coupon:", error.message);
      res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };

 
}
module.exports = new couponsController();
