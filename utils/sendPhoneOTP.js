const axios = require("axios");

async function sendOTP(MobileNo, OTP) {
  console.log("MobileNo inside sendOTP fn ", MobileNo);

  const SMS_API_KEY = process.env.SMS_API_KEY;
  const SENDER_ID = process.env.SENDER_ID;

  const text = `Use this OTP ${OTP} for registration. -BUDCEO`;
  const url = `http://axonsms.com/api/mt/SendSMS?APIKey=${SMS_API_KEY}&senderid=${SENDER_ID}&channel=2&DCS=0&flashsms=0&number=91${MobileNo}&&text=${encodeURIComponent(
    text
  )}`;

  console.log("SMS URL:", url);

  try {
    const response = await axios.post(url, null, {
      headers: {
        "Content-Length": "0",
      },
    });

    console.log("SMS Log:", response.data);
    return response.data;
  } catch (error) {
    // logger.error("Error sending OTP:", error.message);
    console.log("error=>", error.message);
    return { status: 0, message: "Failed to integrate" };
  }
}
module.exports = { sendOTP };
