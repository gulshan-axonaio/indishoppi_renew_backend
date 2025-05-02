const Notification = require("../utils/services/Notification.js");

const sendfirebaseNotification = async (req, res) => {
  console.log(req.body);
  try {
    const { title, body, deviceToken } = req.body;

    await Notification.sendNotification(deviceToken, title, body);
    res
      .status(200)
      .json({ message: "notification sent successfully", success: true });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};
module.exports = { sendfirebaseNotification };
