const jwt = require("jsonwebtoken");

module.exports.authMiddleware = async (req, res, next) => {
  // const { customerToken } = req.cookies;
  const auhthorizationHeader = req.headers.authorization;

  const { accessToken } = req.cookies;

  console.log("authorise", req.headers.authorization);
  console.log("accessToken", accessToken);
  if (!accessToken && !auhthorizationHeader) {
    return res.status(200).json({ error: "Please login first" });
  } else {
    try {
      const deCodeToken = await jwt.verify(
        accessToken || auhthorizationHeader,
        process.env.SECRET
      );

      req.role = deCodeToken.role || "seller";
      req.id = deCodeToken.id;
      next();
    } catch (error) {
      return res
        .status(200)
        .json({ error: "Please login", message: "login please ", status: 400 });
    }
  }
};
module.exports.customerMiddleware = async (req, res, next) => {
  const { customerToken, accessToken } = req.cookies;
  const auhthorizationHeader = req.headers.authorization;

  // const { accessToken } = req.cookies;
  if (!customerToken && !auhthorizationHeader) {
    return res.status(200).json({
      error: "Please login first",
      message: "login please ",
      status: 400,
    });
  } else {
    try {
      const deCodeToken = await jwt.verify(
        customerToken || auhthorizationHeader,
        process.env.SECRET
      );

      req.role = deCodeToken.role || "customer";
      req.user = deCodeToken;
      req.token = customerToken || auhthorizationHeader;
      req.id = deCodeToken.id;
      next();
    } catch (error) {
      return res
        .status(200)
        .json({ error: "Please login", message: "login please ", status: 400 });
    }
  }
};

module.exports.searchMiddleware = async (req, res, next) => {
  const { customerToken, accessToken } = req.cookies;
  const auhthorizationHeader = req.headers.authorization;

  // const { accessToken } = req.cookies;
  if (!customerToken && !auhthorizationHeader) {
    next();
  } else {
    try {
      const deCodeToken = await jwt.verify(
        customerToken || accessToken || auhthorizationHeader,
        process.env.SECRET
      );
      console.log(deCodeToken);
      // console.log("deCodeToken.......", deCodeToken);
      req.role = deCodeToken.role || "seller";
      req.user = deCodeToken;

      req.id = deCodeToken.id;
      next();
    } catch (error) {
      console.log(error.message);
      next();
    }
  }
};
