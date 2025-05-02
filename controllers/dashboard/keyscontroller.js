const KEYmodel = require("../../models/KEYmodel");

const attachKeys = async (req, res, next) => {
  if (req.role != "admin") {
    res.status(401).json({
      message: "keys generation failed unauthorized user ",
    });
  }
  const { clientId, apiSECRETkey, apiSALTkey, apiAESkey } = req.body;
  try {
    const keys = await KEYmodel.create({
      clientId,
      apiSECRETkey,
      apiSALTkey,
      apiAESkey,
    });

    if (keys) {
      res.status(201).json({
        message: "keys created successfully",
        data: keys,
      });
    }
  } catch (error) {
    res.json({
      message: "keys generation failed ",
      error: error.message,
    });
  }
};
const getKeys = async (req, res, next) => {
  try {
    const keys = await KEYmodel.findOne();

    if (keys) {
      res.status(201).json({
        message: "keys fetched successfully",
        data: keys,
      });
    }
  } catch (error) {
    res.json({
      message: "keys getching failed ",
      error: error.message,
    });
  }
};
module.exports = { attachKeys, getKeys };
