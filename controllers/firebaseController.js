const { NotificationModel } = require("../models/notification.js");
const Notification = require("../utils/services/Notification.js");

const sendfirebaseNotification = async (req, res) => {
  try {
    const { title, body, userId, deviceToken } = req.body;

    const notification = new NotificationModel({
      userId,
      title,
      message: body,
    });
    await notification.save();
    await Notification.sendNotification(deviceToken, title, body);
    res
      .status(200)
      .json({ message: "notification sent successfully", success: true });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

module.exports = { sendfirebaseNotification };
