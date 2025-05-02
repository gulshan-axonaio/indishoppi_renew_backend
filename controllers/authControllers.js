const adminModel = require("../models/adminModel");
const sellerModel = require("../models/sellerModel");
const sellerCustomerModel = require("../models/chat/sellerCustomerModel");
const sellerPickupLocationModel = require("../models/sellerPickupLocationModel");
const bcrypt = require("bcryptjs");
const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;
const { responseReturn } = require("../utiles/response");
const { createToken } = require("../utiles/tokenCreate");
const generateOTP = require("../utiles/generateOtp");
const { sendEmail } = require("../utiles/email/sendEmail");
const axios = require("axios");

class authControllers {
  admin_login = async (req, res) => {
    const { email, password } = req.body;
    try {
      const admin = await adminModel.findOne({ email }).select("+password");
      if (admin) {
        const match = await bcrypt.compare(password, admin.password);
        if (match) {
          const token = await createToken({
            id: admin.id,
            role: admin.role,
          });

          res.cookie("accessToken", token, {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          responseReturn(res, 200, { token, message: "Login success" });
        } else {
          responseReturn(res, 404, { error: "Password wrong" });
        }
      } else {
        responseReturn(res, 404, { error: "Email not found" });
      }
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };
  admin_register = async (req, res) => {
    const { email, name, password } = req.body;

    try {
      const user = await adminModel.findOne({ email });

      if (user) {
        responseReturn(res, 200, {
          message: "admin already exists",
          code: 400,
        });
        return;
      }

      const admin = await adminModel.create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: "admin",
      });

      const token = await createToken({
        id: admin._id,
        role: "admin", // Replace with the actual role for the admin
      });

      res.cookie("accessToken", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      responseReturn(res, 201, {
        token,
        message: "admin created",
        code: 201,
      });
    } catch (error) {
      console.error("internal server error", error);
    }
  };

  seller_login = async (req, res) => {
    const { email, password } = req.body;
    try {
      const seller = await sellerModel.findOne({ email }).select("+password");

      if (seller) {
        const match = await bcrypt.compare(password, seller.password);

        if (match) {
          const otp = generateOTP();

          await sendEmail(
            email,
            "Login OTP from Indishoppe",
            { name: seller.name, otp: otp },
            "./template/welcome.handlebars"
          );

          await sellerModel.updateOne({ _id: seller._id }, { otp: otp });
          responseReturn(res, 201, { message: "otp sent to your mail" });
        } else {
          responseReturn(res, 200, { error: "Wrong Credentials..." });
        }
      } else {
        responseReturn(res, 200, { error: "User not Found" });
      }
    } catch (error) {
      responseReturn(res, 500, { error: "Internal server Error" });
    }
  };

  verify_otp = async function (req, res, next) {
    try {
      const { email, otp } = req.body;
      const sellerData = await sellerModel.findOne({ email });
      if (Number(sellerData.otp) === otp) {
        const token = await createToken({
          id: sellerData.id,
          role: sellerData.role,
        });
        res.cookie("accessToken", token, {
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        await sellerModel.findByIdAndUpdate(
          { _id: sellerData._id },
          { otp: null }
        );
        responseReturn(res, 200, {
          token,
          message: "logged in successfully ",
          status: 200,
        });
      } else {
        responseReturn(res, 200, { error: "Invalid OTP" });
      }
    } catch (err) {
      responseReturn(res, 500, { error: "Internal server error " });
    }
  };

  seller_register = async (req, res) => {
    console.log("hello");
    const form = formidable({ multiples: true });

    try {
      form.parse(req, async (err, fields, files) => {
        const {
          email,
          name,
          password,
          businessName,
          pan,
          subCategory,
          category,
          adhaar,
          businessAddress,
          pincode,
          gst,
        } = fields;

        const user = await sellerModel.findOne({ email });

        if (user) {
          responseReturn(res, 200, {
            message: "seller already exists",
            code: 400,
          });
          return;
        }

        let docs = [];
        try {
          const filesArray = Object.values(files);
          console.log(filesArray);
          for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i];
            console.log(file);
            const result = await cloudinary.uploader.upload(file.path, {
              folder: "seller-documents-indishopee",
              resource_type: "raw",
            });
            docs.push({
              url: result.url,
            });
          }
          console.log(docs);
        } catch (error) {
          console.log(error.message);
        }
        const seller = await sellerModel.create({
          name,
          email,
          businessName,
          pan,
          subCategory,
          category,
          businessAddress,
          adhaar,
          pincode,
          gst,
          doc: docs,
          password: await bcrypt.hash(password, 10),
          method: "manual",
        });

        await sellerCustomerModel.create({
          myId: seller._id,
        });

        const token = await createToken({
          id: seller._id,
          role: "seller", // Replace with the actual role for the seller
        });

        res.cookie("accessToken", token, {
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        responseReturn(res, 201, {
          token,
          message: "user created",
          code: 201,
        });
      });
    } catch (error) {
      console.error("internal server error", error.message);
    }
  };

  getUser = async (req, res) => {
    const { id, role } = req;

    try {
      if (role === "admin") {
        const user = await adminModel.findById(id);
        responseReturn(res, 200, { userInfo: user });
      } else {
        const seller = await sellerModel.findById(id);
        responseReturn(res, 200, { userInfo: seller });
      }
    } catch (error) {
      responseReturn(res, 500, { error: "Internal server error" });
    }
  };

  profile_image_upload = async (req, res) => {
    const { image } = req.body;

    console.log("image==>", image);

    try {
      if (image) {
        await sellerModel.findByIdAndUpdate(req.id, {
          image,
        });
        const userInfo = await sellerModel.findById(req.id);
        responseReturn(res, 201, {
          message: "image upload success",
          userInfo,
        });
      } else {
        responseReturn(res, 404, { error: "image upload failed" });
      }
    } catch (error) {
      //console.log(error)
      responseReturn(res, 500, { error: error.message });
    }
  };

  profile_info_add = async (req, res) => {
    const { pincode, category, businessName, businessAddress } = req.body;
    const { id } = req;

    try {
      await sellerModel.findByIdAndUpdate(
        id,
        { pincode, category, businessName, businessAddress },
        { new: true }
      );
      const userInfo = await sellerModel.findById(id);
      responseReturn(res, 201, {
        message: "Profile info add success",
        userInfo,
      });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  pickup_location_add = async (req, res) => {
    const { id } = req;
    try {
      const {
        pickup_location,
        name,
        email,
        phone,
        address,
        address_2,
        city,
        state,
        country,
        pin_code,
      } = req.body;

      console.log("req_data", {
        pickup_location,
        name,
        email,
        phone,
        address,
        address_2,
        city,
        state,
        country,
        pin_code,
        id,
      });

      if (!pickup_location || !name || !email || !phone) {
        return res.status(400).json({ message: "Required fields are missing" });
      }
      const pickuplocation = await sellerPickupLocationModel.create({
        sellerId: id,
        pickup_location,
        name,
        email,
        phone,
        address,
        address_2,
        city,
        state,
        country,
        pin_code,
      });
      responseReturn(res, 201, {
        message: "Pickup Location add success",
        pickupLocInfo: pickuplocation,
      });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  pickup_location_update = async (req, res) => {
    try {
      const {
        pickup_loc_id,
        pickup_location,
        name,
        email,
        phone,
        address,
        address_2,
        city,
        state,
        country,
        pin_code,
      } = req.body;

      console.log("req_data", {
        pickup_loc_id,
        pickup_location,
        name,
        email,
        phone,
        address,
        address_2,
        city,
        state,
        country,
        pin_code,
      });

      await sellerPickupLocationModel.findByIdAndUpdate(
        pickup_loc_id,
        {
          pickup_location,
          name,
          email,
          phone,
          address,
          address_2,
          city,
          state,
          country,
          pin_code,
        },
        { new: true }
      );
      const pickuplocation = await sellerPickupLocationModel.findById(
        pickup_loc_id
      );

      responseReturn(res, 201, {
        message: "Pickup location updated successfully.",
        pickupLocInfo: pickuplocation,
      });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };
  // hello

  shiprocket_account_add = async (req, res) => {
    const { id } = req;
    try {
      const { shiprocket_email, shiprocket_password } = req.body;

      console.log("detail", { id, shiprocket_email, shiprocket_password });

      const result = await sellerModel.findByIdAndUpdate(
        id,
        {
          shiprocket_email,
          shiprocket_password,
        },
        { new: true }
      );

      responseReturn(res, 201, {
        message: "Account Added Successfully.",
        srAccountDetail: result,
      });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  add_pickup_location_shiprocket = async (req, res) => {
    const {
      pickup_loc_id,
      pickup_location,
      name,
      email,
      phone,
      address,
      address_2,
      city,
      state,
      country,
      pin_code,
      status,
      sellerId,
    } = req.body;

    try {
      if (
        !pickup_location ||
        !name ||
        !email ||
        !phone ||
        !status ||
        !sellerId ||
        !address ||
        !city ||
        !state ||
        !country ||
        !pin_code
      ) {
        return res.status(400).json({ message: "Required fields are missing" });
      }

      const seller_detail = await sellerModel.findById(sellerId);
      const shiprocket_email = seller_detail?.shiprocket_email;
      const shiprocket_password = seller_detail?.shiprocket_password;

      if (!shiprocket_email || !shiprocket_password) {
        return responseReturn(res, 201, {
          message: "Seller Shiprocket account is not added.",
        });
      }

      if (status == 1) {
        const PICKUPLOC_ADD_API_URL = process.env.PICKUPLOC_ADD_API_URL;

        const SHIPROCKET_API_KEY = await this.generateShiprocketToken(
          shiprocket_email,
          shiprocket_password
        );

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SHIPROCKET_API_KEY}`,
        };

        const shiprocketData = {
          pickup_location,
          name,
          email,
          phone,
          address,
          address_2,
          city,
          state,
          country,
          pin_code,
        };

        const { data } = await axios.post(
          PICKUPLOC_ADD_API_URL,
          shiprocketData,
          {
            headers,
          }
        );

        console.log("pickuplocationadd_res", data);

        if (data.success) {
          const {
            company_id,
            pickup_code,
            address,
            address_2,
            address_type,
            city,
            state,
            country,
            gstin,
            pin_code,
            phone,
            email,
            name,
            alternate_phone,
            lat,
            long,
            status,
            phone_verified,
            rto_address_id,
            extra_info,
          } = data.address;

          await sellerPickupLocationModel.findByIdAndUpdate(
            pickup_loc_id,
            {
              company_id: company_id || null,
              pickup_id: data.pickup_id || null,
              company_name: data.company_name || "",
              full_name: data.full_name || "",
              pickup_code: pickup_code || null,
              address: address || "",
              address_2: address_2 || "",
              address_type: address_type || "",
              city: city || "",
              state: state || "",
              country: country || "",
              gstin: gstin || "",
              pin_code: pin_code || "",
              phone: phone || "",
              email: email || "",
              name: name || "",
              alternate_phone: alternate_phone || "",
              lat: lat || null,
              long: long || null,
              status: status,
              phone_verified: phone_verified || 0,
              rto_address_id: rto_address_id || null,
              extra_info: extra_info || "",
            },
            { new: true }
          );

          return responseReturn(res, 201, {
            message: "Pickup Location added successfully",
            // pickup_id: data.pickup_id,
            // pickup_code: data.address.pickup_code,
            // address: data.address,
            // company_name: data.company_name,
          });
        } else {
          return responseReturn(res, 400, {
            message: "Failed to add pickup location",
            errorDetails: data,
          });
        }
      } else {
        await sellerPickupLocationModel.findByIdAndUpdate(
          pickup_loc_id,
          { status },
          { new: true }
        );

        return responseReturn(res, 201, {
          message: "This request has been rejected.",
        });
      }
    } catch (error) {
      return responseReturn(res, 500, { error: error.message });
    }
  };

  logout = async (req, res) => {
    try {
      res.cookie("accessToken", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      responseReturn(res, 200, { message: "logout success" });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  generateShiprocketToken = async (shiprocket_email, shiprocket_password) => {
    const credentials = {
      email: shiprocket_email,
      password: shiprocket_password,
    };

    try {
      const response = await axios.post(process.env.SR_AUTH_API, credentials);
      const token = response.data.token;
      console.log("Generated Token:", token);
      return token;
    } catch (error) {
      console.error("Error generating token:", error);
    }
  };
}
module.exports = new authControllers();
