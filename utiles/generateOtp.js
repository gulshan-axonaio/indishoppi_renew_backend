//4 digit numeric OTP generator

function generateOTP() {
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString();
}

module.exports = generateOTP;
