const jwt = require("jsonwebtoken");

const createUserToken = async (data) => {
  const token = jwt.sign(data, process.env.SECRET, { expiresIn: "7d" });

  return token;
};
const createAdminToken = async (data) => {
  const token = jwt.sign(data, process.env.ADMIN_SECRET, { expiresIn: "7d" });

  return token;
};
module.exports = { createAdminToken, createUserToken };
