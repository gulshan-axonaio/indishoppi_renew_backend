const bcrypt = require("bcryptjs");
const { createUserToken } = require("../../utils/generateToken.js");
const { sendOTP } = require("../../utils/sendPhoneOTP.js");
const customerModel = require("../../models/customerModel.js");
const generateOTP = require("../../utiles/generateOtp.js");

// _______________________  | MOBILE |   ___________________________

async function sendLoginPhoneOTP(req, res) {
  try {
    const { phonenumber } = req.body;
    console.log(req.body);
    console.log("phonenumber==> ", phonenumber);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 30 * 1000); // 30 second from now
    if (!phonenumber) {
      return res
        .status(200)
        .json({ status: 404, message: "please provide phonenumber" });
    }
    let user = await customerModel.findOne({ phonenumber });
    if (!user) {
      return res.status(200).json({
        status: 404,
        message: "User not registered",
      });
    }

    if (user.isRegistered == false) {
      return res.status(200).json({
        status: 404,
        message: "User not registered",
      });
    }

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    await user.save();
    const smsResponse = await sendOTP(phonenumber, otp);
    res.json({
      success: true,
      status: 200,
      otp,
      message: "we have sent login otp to your number",
    });
    console.log("SMS sent successfully:", smsResponse);
  } catch (error) {
    console.log(error.message);
    return res.json({
      status: 400,
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
}

const verifyLoginPhoneOtp = async (req, res) => {
  const { phonenumber, otp, deviceId } = req.body;
  if (!phonenumber || !otp)
    return res
      .status(200)
      .json({ status: 400, message: "Phonenumber and OTP are required" });

  try {
    const user = await customerModel.findOne({ phonenumber });

    if (!user.isRegistered) {
      return res.status(200).json({
        success: false,
        status: 400,
        message: "please complete your registeration first",
      });
    }

    if (Number(user.otp) !== Number(otp)) {
      return res.status(200).json({
        success: false,
        status: 400,
        message: "Invalid OTP",
      });
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "OTP expired",
      });
    }

    // if (user.otpExpiry < Date.now()) {
    //   return res.status(200).json({
    //     success: false,
    //     status: 400,
    //     message: "expired OTP",
    //   });
    // }

    user.otp = null;
    user.otpExpiry = null;
    user.isRegistered = true;
    user.deviceId = deviceId;
    await user.save();
    const token = await createUserToken({
      id: user._id,
      phonenumber: user.phonenumber,
      name: user.name,
      email: user.email,
    });
    return res
      .cookie("accessToken", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .json({
        user: {
          token,
          userId: user._id,
          phonenumber,
          deviceId: user.deviceId,
        },
        success: true,
        status: 200,
        message: "OTP verified successfully",
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: "Error verifying OTP",
      error,
    });
  }
};
async function registerUser(req, res) {
  try {
    const { phonenumber, email, name } = req.body;
    if (!phonenumber) {
      return res.status(400).json({
        status: 400,
        message: "please provide phonenumber, email, username",
      });
    }
    const isUserExist = await customerModel.findOne({ phonenumber });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 30 * 1000); // OTP valid for 30 sec
    if (isUserExist) {
      console.log(isUserExist.isRegistered);
      if (!isUserExist.isRegistered) {
        await customerModel.findOneAndUpdate(
          { phonenumber },
          {
            otp,
            otpExpiry,
          }
        );
        const smsResponse = await sendOTP(phonenumber, otp);
        console.log("SMS sent successfully:", smsResponse);

        return res
          .status(200)
          .json({ status: 200, message: "Please verify your number with OTP" });
      }

      return res.json({
        success: true,
        status: 400,
        message: "User already registered please log in.",
      });
    }

    const user = new customerModel({
      name,
      email,
      phonenumber,
      method: "mannualy",
      otp,
      otpExpiry,
    });
    await user.save();

    // _____SEND OTP TO PHONENUMBER ____

    const smsResponse = await sendOTP(phonenumber, otp);
    console.log("SMS sent successfully:", smsResponse);

    return res.json({
      success: true,
      user,
      status: 200,
      message: "Please verify your number with the OTP.",
    });
  } catch (error) {
    return res.json({
      success: false,
      status: 400,
      message: "Registration failed",
      error: error.message,
    });
  }
}

const verifyRegisterationPhoneOtp = async (req, res) => {
  const { phonenumber, otp, deviceId } = req.body;

  // Check if request contains both fields
  if (!phonenumber || !otp) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Phonenumber and OTP are required",
    });
  }

  try {
    // Find user by phone number
    const user = await customerModel.findOne({ phonenumber });

    // Check if user exists
    if (!user) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid OTP",
      });
    }

    // Compare OTP (ensure both are numbers)
    if (Number(user.otp) !== Number(otp)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid OTP",
      });
    }

    //Check OTP expiry (Convert `user.otpExpiry` to timestamp)
    if (user.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "OTP expired",
      });
    }

    //  Mark user as registered and clear OTP
    user.otp = null;
    user.otpExpiry = null;
    user.optVerified = true;
    user.isRegistered = true;
    user.deviceId = deviceId;

    await user.save();

    // Generate token
    const token = await createUserToken({
      id: user._id,
      phonenumber: user.phonenumber,
      email: user.email,
      name: user.name,
    });

    // Send response
    res
      .cookie("accessToken", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .json({
        success: true,
        status: 200,
        message: "OTP verified successfully",
        user: {
          userId: user._id,
          phonenumber: user.phonenumber,
          deviceId: user.phonenumber,
          token,
        },
      });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      status: 500,
      message: "Error verifying OTP",
      error: error.message,
    });
  }
};

const resetPasswordSendOtp = async (req, res) => {
  const { phonenumber } = req.body;
  if (!phonenumber)
    return res
      .status(200)
      .json({ status: 400, message: "Phonenumber is required" });

  try {
    const user = await customerModel.findOne({ phonenumber });
    if (!user)
      return res
        .status(200)
        .json({ status: 404, message: "User not registered" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 30 * 1000); // 5 minutes from now
    user.passResetOtp = otp;
    user.passResetOtpExpiry = otpExpiry;
    await user.save();

    // Simulate sending OTP (e.g., via SMS API)
    const smsResponse = await sendOTP(phonenumber, otp);
    console.log("SMS sent successfully:", smsResponse);

    console.log(`OTP resent to ${phonenumber}: ${otp}`);

    res.json({
      success: true,
      status: 200,
      message: "OTP sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: "Error resending OTP",
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  console.log("recieved hitt");
  const {
    phonenumber,
    oldPassword,
    newPassword,
    confirmNewPassword,
  } = req.body;
  if (!phonenumber || !newPassword)
    return res
      .status(200)
      .json({ status: 400, message: "phonenumber and password is required" });
  if (newPassword !== confirmNewPassword) {
    return res.status(200).json({
      status: 400,
      message: "password and confirm password must be same",
    });
  }

  try {
    const user = await customerModel.findOne({ phonenumber });
    if (!user)
      return res.status(200).json({ status: 404, message: "user not found" });

    const isTruePass = await bcrypt.compare(oldPassword, user.password);
    console.log(isTruePass);
    if (!isTruePass) {
      return res
        .status(200)
        .json({ status: 401, message: "invalid credentials" });
    }
    const updatedUser = await customerModel.findOneAndUpdate(
      { phonenumber },
      {
        passResetOtp: null,
        passResetOtpExpiry: null,
        password: await bcrypt.hash(newPassword, 10),
      },
      { new: true, runValidators: true }
    );
    console.log(updatedUser);
    return res
      .status(200)
      .json({ status: 200, message: "password changed successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: "Error while changing password",
      error: error.message,
    });
  }
};

const resetPasswordVerifyOtp = async (req, res) => {
  const { phonenumber, otp, newpassword, confirmNewPassword } = req.body;
  if (newpassword !== confirmNewPassword) {
    return res.status(400).json({
      status: 400,
      message: "newpassword and confirmNewPassword must be same ",
    });
  }
  if (!phonenumber || !otp || !newpassword)
    return res.status(400).json({
      status: 400,
      message: "Phonenumber, otp and newpassword required",
    });

  try {
    const user = await customerModel.findOne({ phonenumber });
    if (!user)
      return res
        .status(404)
        .json({ status: 404, message: "User not registered" });

    if (
      Number(user.passResetOtp) !== Number(otp) ||
      user.passResetOtpExpiry < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid or expired OTP",
      });
    }
    const updatedUser = await customerModel.findOneAndUpdate(
      {
        phonenumber,
        passResetOtp: otp,
        passResetOtpExpiry: { $gte: Date.now() },
      },
      {
        passResetOtp: null,
        passResetOtpExpiry: null,
        password: await bcrypt.hash(newpassword, 10),
      },
      { new: true, runValidators: true }
    );

    console.log(updatedUser);
    return res.json({
      success: true,
      status: 200,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: "Error resending OTP",
      error,
    });
  }
};
const resendPhoneOtp = async (req, res) => {
  const { phonenumber } = req.body;
  if (!phonenumber)
    return res
      .status(400)
      .json({ status: 400, message: "Phone number is required" });

  try {
    const user = await customerModel.findOne({ phonenumber });
    if (!user)
      return res
        .status(404)
        .json({ status: 404, message: "User not registered" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Simulate sending OTP (e.g., via SMS API)
    const smsResponse = await sendOTP(phonenumber, otp);
    console.log("SMS sent successfully:", smsResponse);

    console.log(`OTP resent to ${phonenumber}: ${otp}`);

    res.json({
      success: true,
      status: 200,
      message: "OTP resent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: "Error resending OTP",
      error,
    });
  }
};

const updateDetails = async (req, res) => {
  try {
    const { email, address, name, dob, phonenumber } = req.body;
    // Validate required fields
    if (!email || !address || !name || !dob || !phonenumber) {
      return res.status(400).json({
        message:
          "All fields (email, address, name, dob, phonenumber) are required",
        success: false,
      });
    }

    // Convert dob to a Date object
    const parsedDob = new Date(dob);
    if (isNaN(parsedDob)) {
      return res.status(400).json({
        message:
          "Invalid date format. dob must be a valid date (e.g., 01/01/2000 or YYYY-MM-DD)",
        success: false,
      });
    }

    const updatedUser = await customerModel
      .findOneAndUpdate(
        { phonenumber },
        {
          email,
          address,
          name,
          dob,
        },
        { new: true, runValidators: true }
      )
      .select("-password");

    if (!updatedUser) {
      return res.json({
        message: "profile update failed",
        status: 400,
        success: false,
      });
    }

    return res.json({
      message: "profile updated successfully",
      user: {
        userId: updatedUser._id,
        upiId: updatedUser.upiId,
        name: updatedUser.name,
        dob: updatedUser.dob,
        email: updatedUser.email,
        phonenumber: updatedUser.phonenumber,
        address: updatedUser.address,
      },
      status: 200,
      success: false,
    });
  } catch (error) {
    return res.json({
      message: error.message,
      status: 500,
      success: false,
    });
  }
};

const setPassword = async (req, res) => {
  const { phonenumber, password, confirmPassword } = req.body;
  if (!phonenumber || !password || !confirmPassword) {
    return res
      .status(400)
      .json({ status: 400, message: "All fields are required" });
  }
  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ status: 400, message: "Passwords do not match" });
  }

  try {
    const user = await customerModel.findOne({ phonenumber });
    if (!user)
      return res
        .status(404)
        .json({ status: 404, success: false, message: "User not found" });
    if (!user.optVerified)
      return res.status(404).json({
        success: false,
        status: 400,
        message: "number not verified, Please complete your registeration",
      });
    if (user.password)
      return res.status(200).json({
        status: 400,
        success: true,
        message: "pincode already set please forget pincode",
      });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    return res.json({
      success: true,
      status: 200,
      message: "Password set successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      success: false,
      message: "Error setting password",
      error: error.message,
    });
  }
};
const userPhoneLogout = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await customerModel.findOne({ _id: userId });

    user.deviceId = "";
    user.save();
    return res
      .cookie("accessToken", "", {
        expires: new Date(0),
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      })
      .json({
        success: true,
        status: 200,
        message: "User logged out successfully",
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
      status: 500,
    });
  }
};
async function deleteuser(req, res) {
  const { id } = req.params;

  const deletedUser = await customerModel.findById(id);
  if (!deletedUser) {
    res.json({ success: false, message: "User not deleted  " });
  }
  try {
    return res
      .cookie("accessToken", "", {
        expires: new Date(0), // Set expiration to a past date to clear the cookie
        httpOnly: true, // Ensures the cookie is only accessible via HTTP(S)
        secure: true, // Use `secure: true` if you're using HTTPS
        sameSite: "strict", // Add SameSite policy for security
      })
      .json({ success: true, message: "User deleted  successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
}
async function generateUpiId(req, res) {
  const { phonenumber } = req.body;

  const user = await customerModel.findOne({ phonenumber });
  if (!user) {
    res.json({ status: 404, success: false, message: "User not found  " });
  }
  const genString = phonenumber + "@axonpay";

  if (!user.upiId) {
    const updatedUser = await customerModel.findByIdAndUpdate(
      { phonenumber },
      { upiId: genString },
      { new: true }
    );
    return res.json({
      user: {
        upiId: updatedUser?.upiId,
        phonenumber,
        userId: updatedUser._id,
      },
      success: true,
      status: 201,
      message: "upi id generated  successfully",
    });
  }
  return res.json({
    success: true,
    status: 201,
    user: { upiId: user.upiId },
  });
}
module.exports = {
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
};
