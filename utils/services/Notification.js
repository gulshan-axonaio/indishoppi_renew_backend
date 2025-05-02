const admin = require("../firebase.js");

class Notification {
  /**
   * Send a notification to a device
   * @param {string} deviceToken - The target device's FCM token
   * @param {string} title - The title of the notification
   * @param {string} body - The body of the notification
   * @param {object} [data={}] - Additional data payload (optional)
   */
  static async sendNotification(deviceToken, title, body, data = {}) {
    if (!deviceToken || typeof deviceToken !== "string") {
      throw new Error("Invalid deviceToken provided.");
    }
    if (!title || typeof title !== "string") {
      throw new Error("Invalid title provided.");
    }
    if (!body || typeof body !== "string") {
      throw new Error("Invalid body provided.");
    }

    const message = {
      notification: { title, body },
      data,
      token: deviceToken,
    };

    try {
      const response = await admin.messaging().send(message);
      return response;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }
}

module.exports = { Notification };
