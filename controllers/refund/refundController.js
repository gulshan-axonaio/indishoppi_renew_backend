const androidCustomerOrderModel = require("../../models/androidCustomerOrderModel");
const { responseReturn } = require("../../utiles/response");

async function process_refund(req, res) {
  try {
    const { orderId } = req.params;
    const { acc, ifsc, upiId, accHolderName } = req.body;

    const updatedOrder = await androidCustomerOrderModel.findByIdAndUpdate(
      orderId,
      { upiId, acc, ifsc, accHolderName },
      { new: true }
    );

    if (updatedOrder.createdAt > Date.now() + 7 * 24 * 60 * 60 * 1000) {
      responseReturn(res, 200, { message: "refund Date exceed", status: 400 });
    }
    const refund = await androidCustomerOrderModel.findOneAndUpdate(
      {
        _id: orderId,
      },
      {
        return_details: { initiate_date: new Date(Date.now()) },
        return_status: "started",
      },
      { new: true }
    );
    responseReturn(res, 200, { message: "return started", refund });
  } catch (error) {
    console.log(error.message);
  }
}

async function do_refund(req, res) {
  try {
    const { orderId } = req.params;
    const { acc, ifsc, upiId, referenceNumber, status } = req.body;

    const order = await androidCustomerOrderModel.findOneAndUpdate(
      {
        _id: orderId,
      },
      {
        return_details: { refund_date: new Date(Date.now()) },
        return_status: status || "refunded",
        bank_details: {
          acc,
          ifsc,
          upiId,
          referenceNumber,
        },
      },

      { new: true }
    );
    responseReturn(res, 200, { message: "return started", order });
  } catch (error) {
    cosnole.log(error.message);
  }
}
module.exports = { process_refund, do_refund };
