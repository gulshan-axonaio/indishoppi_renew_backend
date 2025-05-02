const authOrderModel = require("../../models/authOrder");
const sellerModel = require("../../models/sellerModel");
const customerOrder = require("../../models/customerOrder");
const androidCustomerOrder = require("../../models/androidCustomerOrderModel");
const cardModel = require("../../models/cardModel");
const myShopWallet = require("../../models/myShopWallet");
const sellerWallet = require("../../models/sellerWallet");
const sellerPickupLocationModel = require("../../models/sellerPickupLocationModel");
const filteroptionModel = require("../../models/filteroptionModel");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const {
  mongo: { ObjectId },
} = require("mongoose");
const { responseReturn } = require("../../utiles/response");

const moment = require("moment");
const customerAddressModel = require("../../models/customerAddressModel");
const androidCustomerOrderModel = require("../../models/androidCustomerOrderModel");
const { response } = require("express");
const { database } = require("firebase-admin");
const customerModel = require("../../models/customerModel");
const stripe = require("stripe")(
  "sk_test_51Nk8Y4F0B89ncn3xMHxYCwnaouDR6zuX83ckbJivv2jOUJ9CTka6anJcKMLnatgeBUeQq1RcRYynSPgp6f5zS4qF00YZFMYHuD"
);

class orderController {
  add_address = async (req, res) => {
    try {
      const userInfo = req.id;
      const {
        pincode,
        state,
        district,
        landmark,
        phoneNumber,
        houseNumber,
        area,
        defaultAddress,
        typeOfAddress,
        housenumber,
        phonenumber,
        name,
        city,
      } = req.body;

      const address = await customerAddressModel.create({
        pincode,
        state,
        district,
        landmark,
        phonenumber: phoneNumber || phonenumber,
        housenumber: houseNumber || housenumber,
        area,
        defaultAddress,
        userId: userInfo,
        typeOfAddress,
        name,
        city,
      });

      if (address) {
        responseReturn(res, 200, {
          address,
          message: "address creaeted successfully",
          status: 200,
        });
      } else {
        responseReturn(res, 200, {
          address,
          message: "address creaeted failed",
          status: 400,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  markDefaultAddress = async (req, res) => {
    const { addressId } = req.params;
    try {
      const already = await customerAddressModel.findOneAndUpdate(
        { defaultAddress: true },
        { defaultAddress: false },
        {
          new: true,
          runValidators: true, // Optionally ensure validation on update
        }
      );
      const address = await customerAddressModel.findByIdAndUpdate(
        addressId,
        { defaultAddress: true },
        {
          new: true,
          runValidators: true, // Optionally ensure validation on update
        }
      );

      const addresses = await customerAddressModel.find();
      if (address) {
        responseReturn(res, 200, {
          message: "default address set successfully",
          addressId,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  get_all_address = async (req, res) => {
    const { id } = req;
    try {
      const address = await customerAddressModel.find({ userId: id });

      if (address) {
        responseReturn(res, 200, {
          message: "address fetched successfully",
          status: 200,
          address,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  get_default_address = async (req, res) => {
    const userInfo = req.id;
    try {
      const address = await customerAddressModel.findOne({
        userId: userInfo,
        defaultAddress: true,
      });

      if (address) {
        responseReturn(res, 200, {
          message: "default address fetched successfully",
          defaultAddress: address,
        });
      }

      responseReturn(res, 404, {
        message: "default address not found",
        defaultAddress: address,
      });
    } catch (error) {
      console.log(error.message);
    }
  };
  delete_address = async (req, res) => {
    try {
      const { userId } = req.params;
      const address = await customerAddressModel.findByIdAndDelete(userId);

      if (address) {
        responseReturn(res, 200, { userId });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  delete_single_address = async (req, res) => {
    try {
      const { addressId } = req.params;

      const address = await customerAddressModel.findByIdAndDelete(addressId);

      if (address) {
        responseReturn(res, 200, {
          addressId,
          message: "address deleted successfully",
          status: 200,
        });
      } else {
        responseReturn(res, 200, {
          addressId,
          message: "address not found",
          status: 400,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  paymentCheck = async (id) => {
    try {
      const order = await customerOrder.findById(id);

      if (order.payment_status === "unpaid") {
        await customerOrder.findByIdAndUpdate(id, {
          delivery_status: "cancelled",
        });
        await authOrderModel.updateMany(
          {
            orderId: id,
          },
          {
            delivery_status: "cancelled",
          }
        );
      }
      return true;
    } catch (error) {
      console.log(error);
    }
  };

  place_order = async (req, res) => {
    const { price, products, shipping_fee, shippingInfo } = req.body;
    const userId = req.id;
    // console.log("customerOrderProduct==========>>>>>>>", products);

    // console.log("price=====> ", price);
    let authorOrderData = [];
    let cardId = [];
    const tempDate = moment(Date.now()).format("LLL");

    let customerOrderProduct = [];

    for (let i = 0; i < products.length; i++) {
      const pro = products[i].products;
      for (let j = 0; j < pro.length; j++) {
        let tempCusPro = pro[j].productInfo;
        tempCusPro.quantity = pro[j].quantity;
        customerOrderProduct.push(tempCusPro);
        if (pro[j]._id) {
          cardId.push(pro[j]._id);
        }
      }
    }
    try {
      const order = await customerOrder.create({
        customerId: userId,
        shippingInfo,
        products: customerOrderProduct,
        price: price + shipping_fee,
        delivery_status: "pending",
        payment_status: "unpaid",
        date: tempDate,
      });

      for (let i = 0; i < products.length; i++) {
        const pro = products[i].products;
        const pri = products[i].price;
        const sellerId = products[i].sellerId;
        let storePro = [];
        for (let j = 0; j < pro.length; j++) {
          let tempPro = pro[j].productInfo;
          tempPro.quantity = pro[j].quantity;
          storePro.push(tempPro);
        }
        // console.log(pri, "=====>pri");
        authorOrderData.push({
          orderId: order.id,
          sellerId,
          products: storePro,
          price: pri,
          payment_status: "unpaid",
          shippingInfo,
          delivery_status: "pending",
          date: tempDate,
        });
      }
      const data = await authOrderModel.insertMany(authorOrderData);
      // console.log(order.id);
      // console.log("array data ==> ", data);

      // setTimeout(() => {
      //   this.paymentCheck(order.id);
      // }, 15000);
      responseReturn(res, 201, {
        message: "order created successfully",
        orderId: order.id,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_customer_databorad_data = async (req, res) => {
    const { userId } = req.params;

    try {
      const recentOrders = await customerOrder
        .find({
          customerId: new ObjectId(userId),
        })
        .limit(5);
      const pendingOrder = await customerOrder
        .find({
          customerId: new ObjectId(userId),
          delivery_status: "pending",
        })
        .countDocuments();
      const totalOrder = await customerOrder
        .find({
          customerId: new ObjectId(userId),
        })
        .countDocuments();
      const cancelledOrder = await customerOrder
        .find({
          customerId: new ObjectId(userId),
          delivery_status: "cancelled",
        })
        .countDocuments();
      responseReturn(res, 200, {
        recentOrders,
        pendingOrder,
        cancelledOrder,
        totalOrder,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_orders = async (req, res) => {
    const { customerId, status } = req.params;

    try {
      let orders = [];
      if (status !== "all") {
        orders = await customerOrder.find({
          customerId: new ObjectId(customerId),
          delivery_status: status,
        });
      } else {
        orders = await customerOrder.find({
          customerId: new ObjectId(customerId),
        });
      }
      responseReturn(res, 200, {
        orders,
      });
    } catch (error) {
      console.log(error.message);
    }
  };
  get_order = async (req, res) => {
    const { orderId } = req.params;

    try {
      const order = await customerOrder.findById(orderId);
      responseReturn(res, 200, {
        order,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_admin_orders = async (req, res) => {
    let { page, parPage, searchValue } = req.query;
    console.log(page, parPage, searchValue);
    page = parseInt(page);
    parPage = parseInt(parPage);

    const skipPage = parPage * (page - 1);

    try {
      if (searchValue) {
      } else {
        const orders = await customerOrder
          .aggregate([
            {
              $lookup: {
                from: "authororders",
                localField: "_id",
                foreignField: "orderId",
                as: "suborder",
              },
            },
          ])
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });

        const totalOrder = await customerOrder.aggregate([
          {
            $lookup: {
              from: "authororders",
              localField: "_id",
              foreignField: "orderId",
              as: "suborder",
            },
          },
        ]);

        responseReturn(res, 200, { orders, totalOrder: totalOrder.length });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  get_admin_order = async (req, res) => {
    const { orderId } = req.params;

    try {
      const order = await customerOrder.aggregate([
        {
          $match: { _id: new ObjectId(orderId) },
        },
        {
          $lookup: {
            from: "authororders",
            localField: "_id",
            foreignField: "orderId",
            as: "suborder",
          },
        },
      ]);
      responseReturn(res, 200, { order: order[0] });
    } catch (error) {
      console.log("get admin order " + error.message);
    }
  };

  admin_order_status_update = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    try {
      await customerOrder.findByIdAndUpdate(orderId, {
        delivery_status: status,
      });
      responseReturn(res, 200, { message: "order status change success" });
    } catch (error) {
      console.log("get admin order status error " + error.message);
      responseReturn(res, 500, { message: "internal server error" });
    }
  };

  get_seller_orders = async (req, res) => {
    const sellerId = req.id;

    console.log("sellerId", sellerId);

    let { page, parPage, searchValue } = req.query;
    page = parseInt(page) || 1;
    parPage = parseInt(parPage) || 10;

    const skipPage = parPage * (page - 1);

    console.log("searchValue", searchValue);

    try {
      let filter = { sellerId };

      // Search Filter
      if (searchValue) {
        try {
          filter._id = new ObjectId(searchValue);
        } catch (error) {
          return responseReturn(res, 400, { message: "Invalid ID format" });
        }
      }

      // Fetch Orders
      const orders = await androidCustomerOrder
        .find(filter)
        .skip(skipPage)
        .limit(parPage)
        .sort({ createdAt: -1 });

      // Count Total Orders
      const totalOrder = await androidCustomerOrder.countDocuments(filter);

      responseReturn(res, 200, { orders, totalOrder });
    } catch (error) {
      console.log("get seller order error " + error.message);
      responseReturn(res, 500, { message: "Internal server error" });
    }
  };

  get_seller_all_pickup_location = async (req, res) => {
    const sellerId = req.id;

    console.log("sellerId", sellerId);

    try {
      const seller_detail = await sellerModel.findById(sellerId);
      const shiprocket_email = seller_detail?.shiprocket_email;
      const shiprocket_password = seller_detail?.shiprocket_password;

      if (!shiprocket_email || !shiprocket_password) {
        return responseReturn(res, 201, {
          message: "Seller Shiprocket account is not added.",
        });
      }
      const SHIPROCKET_API_KEY = await this.generateShiprocketToken(
        shiprocket_email,
        shiprocket_password
      );

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SHIPROCKET_API_KEY}`,
      };

      const { data } = await axios.get(process.env.PICKUPLOC_GET_API_URL, {
        headers,
      });

      console.log("pickup_location_get_res", data);

      responseReturn(res, 200, { sellerAllPL: data.data });
    } catch (error) {
      responseReturn(res, 500, { message: "Internal server error" });
    }
  };

  get_pickuplocation = async (req, res) => {
    const sellerId = req.id;
    let { page, parPage, searchValue } = req.query;
    page = parseInt(page) || 1;
    parPage = parseInt(parPage) || 10;
    const skipPage = parPage * (page - 1);
    try {
      let filter = { sellerId };

      // Search Filter
      if (searchValue) {
        try {
          filter._id = new ObjectId(searchValue);
        } catch (error) {
          return responseReturn(res, 400, { message: "Invalid ID format" });
        }
      }

      // Fetch Orders
      const pickupLocation = await sellerPickupLocationModel
        .find(filter)
        .skip(skipPage)
        .limit(parPage)
        .sort({ createdAt: -1 });

      // Count Total Orders
      const totalPickupLocation = await sellerPickupLocationModel.countDocuments(
        filter
      );

      responseReturn(res, 200, { pickupLocation, totalPickupLocation });
    } catch (error) {
      responseReturn(res, 500, { message: "Internal server error" });
    }
  };

  admin_get_pickup_location = async (req, res) => {
    let { valueName, page, parPage, searchValue } = req.query;
    let status = 0;
    page = parseInt(page) || 1;
    parPage = parseInt(parPage) || 10;
    const skipPage = parPage * (page - 1);

    console.log("newvalueName", valueName);

    if (valueName === "new") {
      status = 0;
    } else if (valueName === "active") {
      status = 1;
    } else if (valueName === "rejected") {
      status = 2;
    } else {
      status = 3;
    }
    try {
      let filter = { status };

      const pickupLocation = await sellerPickupLocationModel
        .find(filter)
        .skip(skipPage)
        .limit(parPage)
        .sort({ createdAt: -1 });

      // Count Total Orders
      const totalPickupLocation = await sellerPickupLocationModel.countDocuments(
        filter
      );
      responseReturn(res, 200, { pickupLocation, totalPickupLocation });
    } catch (error) {
      responseReturn(res, 500, { message: "Internal server error" });
    }
  };

  get_seller_order = async (req, res) => {
    const { orderId } = req.params;

    try {
      const order = await authOrderModel.findById(orderId);

      responseReturn(res, 200, { order });
    } catch (error) {
      console.log("get admin order " + error.message);
    }
  };

  seller_order_status_update = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    try {
      await authOrderModel.findByIdAndUpdate(orderId, {
        delivery_status: status,
      });
      responseReturn(res, 200, { message: "order status change success" });
    } catch (error) {
      console.log("get admin order status error " + error.message);
      responseReturn(res, 500, { message: "internal server error" });
    }
  };

  create_payment = async (req, res) => {
    const { price, orderId } = req.body;
    // ______WEBHOOK IMPLEMENTATION_____

    const isPaid = await axios.post();
    await customerOrder.findByIdAndUpdate(orderId, {
      delivery_status: "dispatching",
      payment_status: "paid",
    });
    try {
      // const payment = await stripe.paymentIntents.create({
      //   amount: price * 100,
      //   currency: "usd",
      //   automatic_payment_methods: {
      //     enabled: true,
      //   },
      // });
      responseReturn(res, 200, { clientSecret: payment.client_secret });
    } catch (error) {
      console.log(error.message);
    }
  };

  order_confirm = async (req, res) => {
    const { orderId } = req.params;
    try {
      await customerOrder.findByIdAndUpdate(orderId, {
        payment_status: "paid",
        delivery_status: "pending",
      });
      await authOrderModel.updateMany(
        { orderId: new ObjectId(orderId) },
        {
          payment_status: "paid",
          delivery_status: "pending",
        }
      );
      const cuOrder = await customerOrder.findById(orderId);

      const auOrder = await authOrderModel.find({
        orderId: new ObjectId(orderId),
      });

      const time = moment(Date.now()).format("l");

      const splitTime = time.split("/");

      await myShopWallet.create({
        amount: cuOrder.price,
        manth: splitTime[0],
        year: splitTime[2],
      });

      for (let i = 0; i < auOrder.length; i++) {
        await sellerWallet.create({
          sellerId: auOrder[i].sellerId.toString(),
          amount: auOrder[i].price,
          manth: splitTime[0],
          year: splitTime[2],
        });
      }

      responseReturn(res, 200, { message: "success" });
    } catch (error) {
      console.log(error.message);
    }
  };

  generateInvoice = async (req, res) => {
    try {
      const order = await customerOrder.findById(req.params.orderId);

      if (!order) return res.status(404).send("Order not found");

      // Create a new PDF document with margins
      const doc = new PDFDocument({ margin: 50 });

      // Path to store the generated PDF
      const filePath = path.join(__dirname, `invoice-${order.orderId}.pdf`);
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Add brand logo
      const logoPath = path.join(__dirname, "/indi-shoppe-2.png"); // Adjust the path
      doc.image(logoPath, { fit: [200, 100], align: "left" });
      // Header
      doc
        .fontSize(26)
        .font("Helvetica-Bold")
        .text("Invoice", { align: "center" })
        .moveDown(3);

      // Order Details
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Order Details", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Order ID: ${order._id}`)
        .text(`Customer ID: ${order.customerId}`)
        .moveDown()
        .text(`Date: ${order.date}`)
        .moveDown()
        .text(`Payment Status: ${order.payment_status}`)

        .text(`Delivery Status: ${order.delivery_status}`)
        .moveDown(1);

      // Products Section
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Products", { underline: true })
        .moveDown(0.5);

      doc.fontSize(12).font("Helvetica");

      // Loop through products and add images and details
      order.products.forEach((product, index) => {
        doc.text(`${index + 1}. ${product.name} :  ${product.price}`, {
          indent: 20,
          lineGap: 5,
        });

        // Add product image
      });

      doc.moveDown(1);

      // Total Price
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(`Total Price: ${order.price}`, { align: "right" })
        .moveDown();

      // Footer with brand logo
      doc.moveDown(2);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Thank you for your purchase from indishopee!", {
          align: "center",
          lineGap: 5,
        })
        .moveDown(0.5);
      doc.text("If you have any questions, contact our support.", {
        align: "center",
      });

      // Finalize the PDF and end the stream
      doc.end();

      // Send the file path as a response
      writeStream.on("finish", () => {
        res.download(filePath, `invoice-${order.orderId}.pdf`, (err) => {
          if (err) console.error("Error downloading the file:", err);
          fs.unlinkSync(filePath); // Delete the file after download
        });
      });
    } catch (error) {
      res.status(500).send("Error generating invoice");
    }
  };

  push_order_to_shiprocket = async (req, res) => {
    const { orderId, pickupData } = req.body;
    const sellerId = req.id;
    try {
      console.log("orderId", orderId);
      const CREATE_ORDER_API_URL = process.env.CREATE_ORDER_API_URL;

      if (!CREATE_ORDER_API_URL) {
        return responseReturn(res, 500, {
          message: "Shiprocket API URL is not set",
        });
      }

      const seller_detail = await sellerModel.findById(sellerId);
      const shiprocket_email = seller_detail?.shiprocket_email;
      const shiprocket_password = seller_detail?.shiprocket_password;

      if (!shiprocket_email || !shiprocket_password) {
        return responseReturn(res, 201, {
          message: "Seller Shiprocket account is not added.",
        });
      }

      const orderDetail = await androidCustomerOrder.findById(orderId);

      if (!orderDetail) {
        return responseReturn(res, 404, {
          message: "Order not found",
        });
      }

      const customerDetail = await customerModel.findById(
        orderDetail.customerId
      );

      console.log("customerDetail", customerDetail);

      const SHIPROCKET_API_KEY = await this.generateShiprocketToken(
        shiprocket_email,
        shiprocket_password
      );

      console.log("SHIPROCKET_API_KEY", SHIPROCKET_API_KEY);

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SHIPROCKET_API_KEY}`,
      };

      const totalAmount = orderDetail.products.reduce((acc, product) => {
        return acc + product.discountedPrice * product.quantity;
      }, 0);

      const totalDiscount = orderDetail.products.reduce((acc, product) => {
        const originalTotal = product.price * product.quantity;
        const discountedTotal = product.price * product.quantity;
        return acc + (originalTotal - discountedTotal);
      }, 0);

      console.log("totalAmount", totalAmount);
      console.log("totalDiscount", totalDiscount);

      const shiprocketOrderData = {
        order_id: orderId,
        order_date: orderDetail.createdAt
          .toISOString()
          .split("T")
          .join(" ")
          .split(".")[0],
        pickup_location: pickupData.pickup_location,
        channel_id: "",
        comment: "",
        billing_customer_name: orderDetail.shippingInfo.name,
        billing_last_name: "",
        billing_address: orderDetail.shippingInfo.area,
        billing_address_2: "",
        billing_city: orderDetail.shippingInfo.city,
        billing_pincode: "500081",
        billing_state: orderDetail.shippingInfo.state,
        billing_country: orderDetail.shippingInfo.country || "India",
        billing_email: customerDetail.email || "",
        billing_phone: customerDetail.phonenumber || "",
        shipping_is_billing: true,
        shipping_customer_name: orderDetail.shippingInfo.name,
        shipping_last_name: "",
        shipping_address: orderDetail.shippingInfo.area,
        shipping_address_2: "",
        shipping_city: orderDetail.shippingInfo.city,
        shipping_pincode: "500081",
        shipping_country: orderDetail.shippingInfo.country || "India",
        shipping_state: orderDetail.shippingInfo.state,
        shipping_email: customerDetail.email || "",
        shipping_phone: customerDetail.phonenumber || "",
        order_items: orderDetail.products.map((product) => {
          const originalPrice = parseFloat(product.price);
          const discountedPrice = parseFloat(product.discountedPrice);
          const discountAmount = originalPrice - discountedPrice;

          return {
            name: product.name,
            sku: product.productId,
            units: product.quantity,
            selling_price: discountedPrice.toString(),
            discount: discountAmount.toFixed(2),
            tax: "",
            hsn: "",
          };
        }),
        payment_method: "Prepaid",
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: totalDiscount,
        sub_total: totalAmount,
        length: "10",
        breadth: "10",
        height: "10",
        weight: 0.5,
      };

      console.log("shiprocketOrderData", shiprocketOrderData);

      const response = await axios.post(
        CREATE_ORDER_API_URL,
        shiprocketOrderData,
        {
          headers,
        }
      );

      console.log("shiprocket_response", response);

      if (response.status == 200) {
        await androidCustomerOrder.findByIdAndUpdate(orderId, {
          order_status: "placed in shiprocket",
          shipment_id: response.data.shipment_id,
          srOrderId: response.data.order_i,
          channel_order_id: response.data.channel_order_id,
        });

        return responseReturn(res, 200, {
          message: "Order successfully created in Shiprocket",
          status: response.status,
          shiprocketOrderResponse: response.data,
        });
      } else {
        return responseReturn(res, 200, {
          status: 422,
          message: "Oops! Invalid Data.",
        });
      }
    } catch (error) {
      responseReturn(res, 500, {
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  generateShiprocketToken = async (shiprocket_email, shiprocket_password) => {
    const credentials = {
      email: shiprocket_email,
      password: shiprocket_password,
    };

    try {
      const response = await axios.post(process.env.SR_AUTH_API, credentials);
      const token = response.data.token;
      console.log("Generated Token:", token);
      return token;
    } catch (error) {
      console.error("Error generating token:", error);
    }
  };

  getShiprocketSellerLocation = async () => {
    const credentials = {
      email: process.env.SR_EMAIL,
      password: process.env.SR_PASSWORD,
    };

    // console.log("credentials", credentials);
    // return;

    try {
      const response = await axios.post(
        process.env.SHIPROCKET_SELLER_LOC_API_URL,
        credentials
      );
      const data = response.data;
      console.log("seller location:", data);
      return token;
    } catch (error) {
      console.error("Error:", error);
    }
  };

  admin_get_productType = async (req, res) => {
    let { page, parPage, searchValue } = req.query;
    let status = 0;
    page = parseInt(page) || 1;
    parPage = parseInt(parPage) || 10;
    const skipPage = parPage * (page - 1);

    try {
      const productType = await filteroptionModel
        .find()
        .skip(skipPage)
        .limit(parPage)
        .sort({ createdAt: -1 });

      // Count Total Orders
      const totalProductType = await filteroptionModel.countDocuments();

      // console.log("totalProductType", totalProductType);

      responseReturn(res, 200, { productType, totalProductType });
    } catch (error) {
      responseReturn(res, 500, { message: "Internal server error" });
    }
  };
}

module.exports = new orderController();
