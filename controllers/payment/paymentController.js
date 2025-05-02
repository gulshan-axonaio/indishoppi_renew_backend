const striptModel = require("../../models/stripeModel");
const sellerModel = require("../../models/sellerModel");
const sellerWallet = require("../../models/sellerWallet");
const myShopWallet = require("../../models/myShopWallet");
const withdrowRequest = require("../../models/withdrowRequest");
const { responseReturn } = require("../../utiles/response");
const crypto = require("crypto");
const { default: axios } = require("axios");
const {
  mongo: { ObjectId },
} = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const customerModel = require("../../models/customerModel");
const customerOrder = require("../../models/customerOrder");
const authOrder = require("../../models/authOrder");
const cardModel = require("../../models/cardModel");
const { sendOrderConfirmationEmail } = require("../../utiles/email/sendEmail");
const androidCustomerOrderModel = require("../../models/androidCustomerOrderModel");
const stripe = require("stripe")(
  "sk_test_51Nk8Y4F0B89ncn3xMHxYCwnaouDR6zuX83ckbJivv2jOUJ9CTka6anJcKMLnatgeBUeQq1RcRYynSPgp6f5zS4qF00YZFMYHuD"
);
const helpers = require("handlebars-helpers")();
class paymentController {
  do_payment = async (req, res) => {
    const clientId = process.env.PAYMENT_CLIENTID;
    const apiSECRETkey = process.env.PAYMENT_APISECRETKEY;
    const apiSALTkey = process.env.PAYMENT_APISALTKEY;
    const apiAESkey = process.env.PAYMENT_APIAESKEY;
    const salt = apiSALTkey; // Salt Key
    const key = apiAESkey; // Encryption Key
    const orderId = req.body.orderId;

    console.log("get hit ------->>>> ", req.body);
    const price = Number(req.body.price);
    const currentUser = req.user;

    // console.log(orderId);

    // const isAlreadyProcessed = await authOrder.findOne({ orderId });
    const myOrder = await androidCustomerOrderModel.find({
      orderId: new ObjectId(orderId),
    });

    // return responseReturn(res, 200, {
    //   myOrder,
    // });

    if (!myOrder.length) {
      responseReturn(res, 200, { message: "Order not found", status: 400 });
    }

    const totalDiscountedPrice = myOrder.reduce(
      (sum, order) => sum + order.discountedPrice,
      0
    );

    console.log("totalDiscountedPrice", totalDiscountedPrice);
    console.log("price", price);

    const hasFailedOrder = myOrder.some(
      (order) => order.payment_status === "failed"
    );

    console.log("hasFailedOrder", hasFailedOrder);

    if (totalDiscountedPrice !== price) {
      console.log(
        "Price mismatched: Total discountedPrice =",
        totalDiscountedPrice
      );
      return responseReturn(res, 401, {
        url: null,
        amount: null,
        message: "Price mismatched",
      });
    }

    // console.log("isAlreadyProcessed--->", isAlreadyProcessed);
    // if (
    //   isAlreadyProcessed?.payment_status === "failed" ||
    //   isAlreadyProcessed?.payment_status === "paid"
    // ) {
    //   return responseReturn(res, 401, {
    //     url: null,
    //     amount: null,
    //   });
    // }

    // const price = amount;

    // console.log("price ===> ", price, "orderId===> ", orderId);

    function getSignature(
      key_id,
      key_secret,
      txncurr,
      amount,
      name,
      email,
      mobile
    ) {
      // Combine all the data into the message
      const message =
        key_id + key_secret + txncurr + amount + name + email + mobile;

      // Generate HMAC-SHA256 signature
      const signature = crypto
        .createHmac("sha256", key_secret) // Use key_secret as the secret key
        .update(message) // Use the combined message
        .digest("hex"); // Convert to lowercase hex

      return signature;
    }

    // const phone = isAlreadyProcessed?.shippingInfo?.phone;

    const key_id = clientId;
    const key_secret = apiSECRETkey;
    const txncurr = "INR";
    const amount = price.toFixed(2);
    const name = currentUser.name || myOrder[0].shippingInfo.name;
    const email = currentUser.email || "pratikverma9691@gmail.com";
    const mobile = myOrder[0].shippingInfo.phonenumber.toString();

    const signature = getSignature(
      key_id,
      key_secret,
      txncurr,
      price.toFixed(2),
      name,
      email,
      mobile
    );

    const data = {
      amount: price.toFixed(2),
      key_id: clientId,
      key_secret: apiSECRETkey,
      signature,
      mobile,
      txnCurr: "INR",
      email,
      name,
      udf1: orderId,
      udf2: "Optional2",
    };

    console.log("data-object=>", data, "////");

    // ______________PRACTICE CODE TO GENERATE BANK ENCRYPTION DATA _________
    const bankData = {
      amount: price.toFixed(2),
      key_id: clientId,
      key_secret: apiSECRETkey,
      signature,
      date: "January 04, 2024, 01:08 am",

      mobile,
      txnCurr: "INR",
      email,
      name,
      udf1: orderId,
      description: "Transaction Successfull",
      udf2: "Optional2",
      status: "200",
      transactionId: "PNPcYxJN6InaEXk8o7",
      bankId: "123456",
    };

    const GEN_BANKENC = encrypt(bankData, salt, key);
    console.log("GEN_BANK_ENC :::::::: ", GEN_BANKENC);
    // ___________________________________________________________________

    //__________ENCRYPT______________

    function encrypt(data, salt, key) {
      if (key && data && salt) {
        const algorithm = "aes-256-cbc";

        // IV (Initialization Vector) similar to your PHP array
        const iv = Buffer.from([
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
        ]);

        // Encoding salt and key to UTF-8 (not necessary in JS but keeping it for clarity)
        const saltBuffer = Buffer.from(salt, "utf-8");
        const keyBuffer = Buffer.from(key, "utf-8");

        // Deriving the key using PBKDF2 with SHA1
        const derivedKey = crypto.pbkdf2Sync(
          keyBuffer,
          saltBuffer,
          65536,
          32,
          "sha1"
        );

        // Creating the cipher
        const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
        const stringData = JSON.stringify(data);
        // Encrypting the data
        let encrypted = cipher.update(stringData, "utf-8", "hex");
        encrypted += cipher.final("hex");

        return encrypted;
      } else {
        return "String to encrypt, Salt, and Key are required.";
      }
    }
    const encryptedData = encrypt(data, salt, key);

    async function sendRequest() {
      try {
        const { data } = await axios.post(
          "https://pg.paynpro.com/payment/gateway/v1/live/intent/request",
          {
            key_id: process.env.PAYMENT_CLIENTID,
            data: encryptedData,
          },
          {
            headers: {
              "Content-Type": "application/json", // Ensure headers are set properly
            },
          }
        );
        console.log("data==>", data);
        return data;
      } catch (error) {
        console.error("Error:", error.message);
      }
    }
    function decrypt(encryptedData, salt, key) {
      if (key && encryptedData && salt) {
        const algorithm = "aes-256-cbc";

        // IV (Initialization Vector), same as the encryption function
        const iv = Buffer.from([
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
        ]);

        // Encoding salt and key to UTF-8 (for clarity)
        const saltBuffer = Buffer.from(salt, "utf-8");
        const keyBuffer = Buffer.from(key, "utf-8");

        // Deriving the key using PBKDF2 with SHA1
        const derivedKey = crypto.pbkdf2Sync(
          keyBuffer,
          saltBuffer,
          65536,
          32,
          "sha1"
        );

        // Convert the encrypted hex data back to binary (Buffer)
        const encryptedBuffer = Buffer.from(encryptedData, "hex");

        // Creating the decipher
        const decipher = crypto.createDecipheriv(algorithm, derivedKey, iv);

        // Decrypting the data
        let decrypted = decipher.update(encryptedBuffer, "binary", "utf-8");
        decrypted += decipher.final("utf-8");

        return decrypted;
      } else {
        return "Encrypted String, Salt, and Key are required.";
      }
    }

    //__________DECRYPT______________

    const encryptedRESPONSE = await sendRequest();

    const decryptedRESPONSE = await decrypt(encryptedRESPONSE.data, salt, key);
    console.log("decryptedRESPONSE=>", decryptedRESPONSE);
    const jsonData = await JSON.parse(decryptedRESPONSE);

    console.log("JSON===^^^^^^", jsonData);
    // async function runTaskForOrder(orderId) {
    //   // console.log("timer played");
    //   const updatedData = await authOrder.findOneAndUpdate(
    //     { orderId },
    //     { payment_status: "failed" },
    //     { new: true }
    //   );
    // }

    // setTimeout(async () => {
    //   console.log("timer attached");

    //   const order = await authOrder.findOne({ orderId });

    //   if (
    //     order?.payment_status != "paid" &&
    //     order?.payment_status != "failed"
    //   ) {
    //     runTaskForOrder(orderId);
    //   }
    // }, 120000); // 2 minutes
    function convertUPIToIntent(inputUrl, baseUrl) {
      const params = new URLSearchParams(inputUrl?.split("?")[1]);

      // Map input parameters to the desired format
      const outputParams = new URLSearchParams();
      outputParams.set("ver", "01"); // Version of the payment protocol
      outputParams.set("mode", "22"); // Payment mode
      outputParams.set("pa", params.get("pa")); // Payee address
      outputParams.set("pn", params.get("pn")); // Payee name
      outputParams.set("mc", params.get("mc")); // Merchant category code
      outputParams.set("tr", params.get("tr")); // Transaction reference
      outputParams.set("url", params.get("url") || ""); // URL
      outputParams.set("tn", params.get("tn") || ""); // Transaction note
      outputParams.set("am", params.get("am")); // Amount
      outputParams.set("mam", params.get("am")); // Maximum amount, same as `am`
      outputParams.set("mid", "MER0000000023361"); // Merchant ID (placeholder)
      outputParams.set("qrMedium", "01"); // QR medium type
      outputParams.set("tid", "SURFF6AB7BC508F4374AC81434D1FC5C40D"); // Transaction ID (placeholder)

      // Generate timestamps
      const currentDate = new Date();
      const expireDate = new Date(currentDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
      outputParams.set("QRts", currentDate.toISOString()); // Timestamp when the QR was generated
      outputParams.set("QRexpire", expireDate.toISOString()); // Timestamp when the QR expires

      return `${baseUrl}?${outputParams.toString()}`;
    }
    return responseReturn(res, 200, {
      message: "payment url fetched",
      status: 200,
      data: {
        qrCode: jsonData?.upiIntent,
        amount: jsonData?.amount,
        phonePe: convertUPIToIntent(jsonData?.upiIntent, "phonepe://pay"),
        // gPay: convertUPIToIntent(jsonData.upiIntent, "tez://pay"),
        paytm: convertUPIToIntent(jsonData?.upiIntent, "paytmmp://pay"),
        gPay: jsonData?.upiIntent?.replace("upi://", "tez://upi/"),
        // phonePe: jsonData.upiIntent.replace("upi://", "phonepe://upi/"),
        // paytm: jsonData.upiIntent.replace("upi://", "paytm://upi/"),
      },
    });
  };
  do_cod_payment = async (req, res) => {
    const orderId = req.body.orderId;
    if (
      !myOrder ||
      (myOrder.payment_status == "failed" && myOrder.discountedPrice == price)
    ) {
      console.log("price mismathced");
      return responseReturn(res, 200, {
        status: 200,
        message: "order failed please retry",
      });
    }
    const price = Number(req.body.price);
    const myOrder = await androidCustomerOrderModel.findByIdAndUpdate(
      orderId,
      {
        order_status: "placed",
        payment_details: { method: "cod" },
        payment_status: "unpaid",
      },
      { new: true }
    );
    responseReturn(res, 200, {
      message: "order placed successfully",
      order: myOrder,
      status: 200,
    });
    if (!myOrder) {
      responseReturn(res, 200, { message: "Order not found", status: 400 });
    }
  };
  // _______________WEBHOOK Controller __________________
  async take_payment_response(req, res, next) {
    console.log("take_payment_response===>");

    const apiSALTkey = process.env.PAYMENT_APISALTKEY;
    const apiAESkey = process.env.PAYMENT_APIAESKEY;
    try {
      const salt = apiSALTkey; // Salt Key
      const key = apiAESkey; // Encryption Key

      const { key_id, data } = req.body;

      console.log("take_payment_response_key_id===>", key_id);
      console.log("take_payment_response_data===>", data);

      function decrypt(encryptedData, salt, key) {
        if (key && encryptedData && salt) {
          const algorithm = "aes-256-cbc";

          // IV (Initialization Vector), same as the encryption function
          const iv = Buffer.from([
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
          ]);

          // Encoding salt and key to UTF-8 (for clarity)
          const saltBuffer = Buffer.from(salt, "utf-8");
          const keyBuffer = Buffer.from(key, "utf-8");

          // Deriving the key using PBKDF2 with SHA1
          const derivedKey = crypto.pbkdf2Sync(
            keyBuffer,
            saltBuffer,
            65536,
            32,
            "sha1"
          );

          // Convert the encrypted hex data back to binary (Buffer)
          const encryptedBuffer = Buffer.from(encryptedData, "hex");

          // Creating the decipher
          const decipher = crypto.createDecipheriv(algorithm, derivedKey, iv);

          // Decrypting the data
          let decrypted = decipher.update(encryptedBuffer, "binary", "utf-8");
          decrypted += decipher.final("utf-8");

          return decrypted;
        } else {
          return "Encrypted String, Salt, and Key are required.";
        }
      }

      try {
        const decryptedRESPONSE = decrypt(data, salt, key);

        const jsonData = JSON.parse(decryptedRESPONSE);

        console.log("response from the bank==========>>>> ", jsonData);

        const { udf1, status, amount, transactionId, date } = jsonData; // Add `orderId` in webhook payload

        if (status == 200) {
          console.log("success.......");

          // const updateOrderConfirmation = await authOrder.findOneAndUpdate(
          //   {
          //     orderId: udf1,
          //   },
          //   { payment_status: "paid", transactionId, date },
          //   { new: true }
          // );

          const updateOrderConfirmation = await androidCustomerOrderModel.updateMany(
            {
              orderId: udf1,
            },
            {
              $set: {
                payment_status: "paid",
                order_status: "placed",
                transactionId,
                transactionDate: date,
              },
            }
          );
          console.log("updateOrderConfirmation", updateOrderConfirmation);
          // const updateCustomerOrderConfirmation =
          //   await customerOrder.findByIdAndUpdate(
          //     udf1,

          //     { payment_status: "paid", transactionId, date },
          //     { new: true }
          //   );

          // __________________AFTER PAYMENT CONFIRMED DELETE THE ITEMS FROM CART ______
          // for (let k = 0; k < cardId.length; k++) {
          //   await cardModel.findByIdAndDelete(cardId[k]);
          // }
          // const savedCustomerDetails = await authOrder.findOne({
          //   orderId: udf1,
          // });
          return responseReturn(res, 200, {
            message: "Payment confirmed",
            status: 200,
          });
        }

        const updateOrderConfirmation = await androidCustomerOrderModel.updateMany(
          {
            orderId: udf1,
          },
          {
            $set: {
              payment_status: "failed",
            },
          }
        );

        // const updateOrderConfirmation = await authOrder.findOneAndUpdate(
        //   { orderId: udf1 },
        //   { payment_status: "failed" },
        //   { new: true }
        // );
        await customerOrder.findByIdAndUpdate(
          udf1,

          { payment_status: "failed", transactionId, date },
          { new: true }
        );
        responseReturn(res, 201, {
          message: "Payment failed",
          order: updateOrderConfirmation,
        });
      } catch (error) {
        console.log("DECRYPTION ERROR", error.message);
        responseReturn(res, 401, { message: "Wrong Credentials" });
      }
    } catch (error) {
      responseReturn(res, 401, { message: "payment failed" });
    }
  }

  // _____________________________________________________
  create_stripe_connect_account = async (req, res) => {
    const { id } = req;
    const uid = uuidv4();

    try {
      const stripInfo = await striptModel.findOne({ sellerId: id });

      if (stripInfo) {
        await striptModel.deleteOne({ sellerId: id });
        const account = await stripe.accounts.create({ type: "express" });

        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.DASHBOARD}/refresh`,
          return_url: `${process.env.DASHBOARD}/success?activeCode=${uid}`,
          type: "account_onboarding",
        });
        await striptModel.create({
          sellerId: id,
          stripeId: account.id,
          code: uid,
        });
        responseReturn(res, 201, { url: accountLink.url });
      } else {
        const account = await stripe.accounts.create({ type: "express" });

        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.DASHBOARD}/refresh`,
          return_url: `${process.env.DASHBOARD}/success?activeCode=${uid}`,
          type: "account_onboarding",
        });
        await striptModel.create({
          sellerId: id,
          stripeId: account.id,
          code: uid,
        });
        responseReturn(res, 201, { url: accountLink.url });
      }
    } catch (error) {}
  };

  active_stripe_connect_account = async (req, res) => {
    const { activeCode } = req.params;
    const { id } = req;
    try {
      const userStripeInfo = await striptModel.findOne({ code: activeCode });
      if (userStripeInfo) {
        await sellerModel.findByIdAndUpdate(id, {
          payment: "active",
        });
        responseReturn(res, 200, { message: "payment active" });
      } else {
        responseReturn(res, 404, { message: "payment active failed" });
      }
    } catch (error) {
      responseReturn(res, 500, { message: "Internal server error" });
    }
  };

  sunAmount = (data) => {
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      sum = sum + data[i].amount;
    }
    return sum;
  };

  get_seller_payment_details = async (req, res) => {
    const { sellerId } = req.params;

    try {
      const payments = await sellerWallet.find({ sellerId });

      const pendingWithdrows = await withdrowRequest.find({
        $and: [
          {
            sellerId: {
              $eq: sellerId,
            },
          },
          {
            status: {
              $eq: "pending",
            },
          },
        ],
      });

      const successWithdrows = await withdrowRequest.find({
        $and: [
          {
            sellerId: {
              $eq: sellerId,
            },
          },
          {
            status: {
              $eq: "success",
            },
          },
        ],
      });

      const pendingAmount = this.sunAmount(pendingWithdrows);
      const withdrowAmount = this.sunAmount(successWithdrows);
      const totalAmount = this.sunAmount(payments);

      let availableAmount = 0;

      if (totalAmount > 0) {
        availableAmount = totalAmount - (pendingAmount + withdrowAmount);
      }
      responseReturn(res, 200, {
        totalAmount,
        pendingAmount,
        withdrowAmount,
        availableAmount,
        successWithdrows,
        pendingWithdrows,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  withdrowal_request = async (req, res) => {
    const { amount, sellerId } = req.body;
    // console.log(req.body);
    try {
      const withdrowal = await withdrowRequest.create({
        sellerId,
        amount: parseInt(amount),
      });
      responseReturn(res, 200, {
        withdrowal,
        message: "withdrowal request send",
      });
    } catch (error) {
      responseReturn(res, 500, { message: "Internal server error" });
    }
  };

  get_payment_request = async (req, res) => {
    try {
      const withdrowalRequest = await withdrowRequest.find({
        status: "pending",
      });
      responseReturn(res, 200, { withdrowalRequest });
    } catch (error) {
      responseReturn(res, 500, { message: "Internal server error" });
    }
  };
  async get_payment_status(req, res) {
    const { orderId } = req.params;

    try {
      const order = await androidCustomerOrderModel.find({
        orderId: new ObjectId(orderId),
      });

      const email = req.user?.email;

      if (order[0].payment_status == "paid") {
        try {
          await sendOrderConfirmationEmail(
            email,
            "Order Placed Successfully",
            order.products,
            "./template/orderSuccess.handlebars"
          );
        } catch (error) {
          // console.log(error.message);
        }
      }

      if (order) {
        responseReturn(res, 200, {
          message: "status fetched successfully",
          status: 200,
          payment_status: order[0].payment_status,
        });
      } else {
        responseReturn(res, 200, { message: "Order not found", status: 400 });
      }
    } catch (error) {
      responseReturn(res, 500, { message: error.message });
    }
  }

  payment_request_confirm = async (req, res) => {
    const { paymentId } = req.body;

    try {
      const payment = await withdrowRequest.findById(paymentId);
      const { stripeId } = await striptModel.findOne({
        sellerId: new ObjectId(payment.sellerId),
      });

      await stripe.transfers.create({
        amount: payment.amount * 100,
        currency: "usd",
        destination: stripeId,
      });
      await withdrowRequest.findByIdAndUpdate(paymentId, { status: "success" });
      responseReturn(res, 200, { payment, message: "request confirm success" });
    } catch (error) {
      console.log(error);
      responseReturn(res, 500, { message: "Internal server error" });
    }
  };
}

module.exports = new paymentController();
