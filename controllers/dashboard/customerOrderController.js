const androidCustomerOrderModel = require("../../models/androidCustomerOrderModel.js");
const CusomerOrderModel = require("../../models/androidCustomerOrderModel.js");
const testModel = require("../../models/testModel.js");
const authOrder = require("../../models/authOrder.js");
const cardModel = require("../../models/cardModel.js");
const couponModel = require("../../models/couponModel.js");
const ProductDetailsModel = require("../../models/productDetailsModel.js");
const productModel = require("../../models/productModel.js");
const { responseReturn } = require("../../utiles/response.js");
const { Types } = require("mongoose");
const ObjectId = Types.ObjectId;
const moment = require("moment");

const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
require("jspdf-autotable");
const { jsPDF } = require("jspdf");
class customerOrderController {
  create_order = async (req, res) => {
    try {
      console.log("Create order hitted");
      const uniqueOrderId = `${Date.now().toString().slice(-8)}${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      const {
        sellerId,
        couponCode,
        productId,
        quantity,
        addressName,
        addressPhonenumber,
        addressCity,
        addressState,
        addressDistrict,
        addressArea,
        variationId,
        size,
      } = req.body;

      const sellerIdArray = [new ObjectId(sellerId)];

      console.log(
        "data given by frontend===>",
        sellerId,
        couponCode,
        productId,
        quantity,
        addressName,
        addressPhonenumber,
        addressCity,
        addressState,
        addressDistrict,
        addressArea,
        variationId,
        size,
        sellerIdArray
      );

      if (!productId || !quantity || !variationId || !sellerId) {
        return res.status(200).json({
          message: "Productid and quantity required.",
          status: 400,
        });
      }

      // Check if the coupon exists and is active
      const coupon = await couponModel.findOne({
        code: couponCode,
        isActive: true,
        expiryDate: { $gte: new Date() }, // Ensure the coupon is not expired
      });
      const product = await ProductDetailsModel.findOne({
        productId,
        _id: variationId,
      });

      console.log("product", product);

      // if (product.size.indexOf(size) == -1) {
      //   return responseReturn(res, 200, {
      //     message: "size not available",
      //     status: 400,
      //   });
      // }

      let discount = 0;
      let productPrice = Number(product.discountedPrice) * quantity;
      if (product && coupon) {
        console.log(coupon.type);
        if (coupon.type === "price") {
          discount = Number(coupon.value);
        } else if (coupon.type === "discount" && coupon.upto == null) {
          discount = productPrice - (productPrice * coupon.value) / 100;
        } else if (coupon.type === "discount" && coupon.upto) {
          if (
            productPrice - (productPrice * coupon.value) / 100 >
            coupon.upto
          ) {
            discount = Number(coupon.upto);
          } else {
            discount = productPrice - (productPrice * coupon.value) / 100;
          }
        }

        // Ensure the discounted price is not negative
        discount = Math.max(0, discount);
      }

      console.log("price", { discount, productPrice });

      if (product) {
        // Respond with the calculated discounted price
        const order = await androidCustomerOrderModel.create({
          customerId: req.id,
          orderId: new ObjectId(uniqueOrderId),
          appliedCoupon: couponCode,
          sellerId: sellerIdArray,
          discountedPrice: productPrice - discount,
          price: productPrice,
          couponDiscount: Number(discount),
          selectedSize: size,
          payment_status: "unpaid",
          order_status: "pending",
          products: [
            {
              productId,
              quantity,
              variantId: variationId,
              couponDiscount: discount,
              price: productPrice,
              discountedPrice: productPrice - discount,
              size,
            },
          ],
          shippingInfo: {
            name: addressName,
            phonenumber: addressPhonenumber,
            city: addressCity,
            state: addressState,
            district: addressDistrict,
            area: addressArea,
          },
        });

        const allOrders = await androidCustomerOrderModel.find({
          orderId: new ObjectId(uniqueOrderId),
        });

        const totalAmount = allOrders.reduce(
          (sum, order) => sum + order.discountedPrice,
          0
        );

        console.log("created order === > ", order);
        return res.status(200).json({
          message: "order created successfully.",
          status: 200,
          orderId: new ObjectId(uniqueOrderId),
          order,
          totalAmount,
        });
      } else {
        return res.status(200).json({
          message: "invalid productId or vairantId",
          status: 400,
        });
        console.log("invalid productId or vairantId");
      }
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      return res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };
  create_cart_order = async (req, res) => {
    try {
      let userId = req.id;
      // let userId = "67d1800aa5970319627d7ae6";
      console.log("userId--->", userId);

      const uniqueOrderId = `${Date.now().toString().slice(-8)}${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      const {
        couponCode,
        addressName,
        addressPhonenumber,
        addressCity,
        addressState,
        addressDistrict,
        addressArea,
      } = req.body;

      let sellerProductsMap = new Map(); // Seller-wise grouping

      // Fetch Cart Products
      const card_products = await cardModel.aggregate([
        { $match: { userId: new ObjectId(userId) } },
        {
          $lookup: {
            from: "variants",
            localField: "variantId",
            foreignField: "_id",
            as: "products",
          },
        },
      ]);

      if (card_products.length < 1) {
        return res.status(200).json({ message: "Cart is empty", status: 200 });
      }

      // 🛒 Filter only in-stock products
      const stockProducts = card_products.filter(
        (p) => p.products[0]?.stock >= p.quantity
      );

      if (stockProducts.length < 1) {
        return res
          .status(400)
          .json({ message: "No products in stock", status: 400 });
      }

      // 🔄 Group products by unique sellerId
      for (let product of stockProducts) {
        const { quantity, size, variantId, sellerId } = product;
        const { price, discount, name } = product.products[0];

        let discountedPrice = discount
          ? price - Math.floor((price * discount) / 100)
          : price;

        let productObj = {
          productId: product.productId,
          quantity,
          variantId,
          size,
          price,
          discountedPrice,
          discount,
          sellerId,
          name,
        };

        if (!sellerProductsMap.has(sellerId)) {
          sellerProductsMap.set(sellerId, []);
        }
        sellerProductsMap.get(sellerId).push(productObj);
      }

      // 🏷️ Fetch Coupon (if applicable)
      const coupon = await couponModel.findOne({
        code: couponCode,
        isActive: true,
        expiryDate: { $gte: new Date() },
      });

      let discount = 0;
      let totalCartPrice = stockProducts.reduce(
        (sum, p) =>
          sum +
          p.quantity *
            (p.products[0].price -
              Math.floor((p.products[0].price * p.products[0].discount) / 100)),
        0
      );

      if (coupon) {
        if (coupon.type === "price") {
          discount = Number(coupon.value);
        } else if (coupon.type === "discount" && coupon.upto == null) {
          discount = totalCartPrice * (coupon.value / 100);
        } else if (coupon.type === "discount" && coupon.upto) {
          discount = Math.min(
            totalCartPrice * (coupon.value / 100),
            coupon.upto
          );
        }
        discount = Math.max(0, discount);
      }

      console.log("Creating Orders...");

      let order = [];
      let totalAmount = 0;

      for (let [sellerId, products] of sellerProductsMap) {
        let sellerTotalPrice = products.reduce(
          (sum, p) => sum + p.quantity * p.discountedPrice,
          0
        );

        let sellerDiscount = discount / sellerProductsMap.size;
        let finalAmount = sellerTotalPrice - sellerDiscount;
        totalAmount += finalAmount; // Add to total amount

        let newOrder = await androidCustomerOrderModel.create({
          customerId: new ObjectId(userId),
          appliedCoupon: couponCode,
          payment_status: "unpaid",
          order_status: "pending",
          discountedPrice: sellerTotalPrice - sellerDiscount,
          price: sellerTotalPrice,
          couponDiscount: Number(sellerDiscount),
          sellerId: new ObjectId(sellerId),
          orderId: new ObjectId(uniqueOrderId),
          products: products,
          shippingInfo: {
            name: addressName,
            phonenumber: addressPhonenumber,
            city: addressCity,
            state: addressState,
            district: addressDistrict,
            area: addressArea,
          },
        });

        order.push(newOrder);
      }

      return res.status(200).json({
        message: "Orders created successfully.",
        status: 200,
        orderId: new ObjectId(uniqueOrderId),
        totalAmount,
        order,
      });
    } catch (error) {
      console.error("Error processing order", error.message);
      return res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };

  remove_cart_success = async (req, res) => {
    try {
      let userId = req.id;
      await cardModel.deleteMany({ userId: userId });

      return res.status(200).json({
        message: "crat empty success.",
        status: 200,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };

  get_orders = async (req, res) => {
    const userId = req.id;
    try {
      const orders = await androidCustomerOrderModel
        .find({ customerId: userId })
        .populate({
          path: "products.variantId",
          model: "variants",
        })
        .lean()
        .sort({ createdAt: -1 });

      const formattedOrders = orders.map((order) => ({
        id: order._id,
        orderId: order.orderId,
        sellerId: order.sellerId,
        customerId: order.customerId,
        discountedPrice: order.discountedPrice,
        quantity: order.quantity,
        selectedSize: order.selectedSize,
        order_status: order.order_status,
        updatedAt: order.updatedAt,
        createdAt: order.createdAt,
        products: order.products.map((product) => ({
          productDetails: product.variantId,
          productId: product.productId,
          quantity: product.quantity,
          discount: product.discount,
          totalPirce: product.totalPirce,
          discountedPrice: product.discountedPrice,
        })),
      }));
      responseReturn(res, 200, {
        orders: formattedOrders,
        message: "orders fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };
  get_orderDetails = async (req, res) => {
    try {
      function addDaysToDate(dateString, days) {
        let date = new Date(dateString);
        date.setDate(date.getDate() + days);
        return date;
      }

      const { orderId } = req.params;

      const order = await androidCustomerOrderModel
        .findById(orderId)
        .populate({
          path: "products.variantId",
          model: "variants",
        })
        .lean()
        .sort({ createdAt: -1 });

      if (!order) {
        responseReturn(res, 200, { message: "no order found", status: 400 });
        return; // return to stop further execution
      }

      console.log("order===>", order);

      const formattedOrders = {
        _id: order._id,
        customerId: order.customerId,
        selectedSize: order.selectedSize,
        priceDetails: {
          productListedPrice: order.products[0]?.variantId?.price,
          sellingPrice: Math.round(
            order.products[0]?.variantId?.discountedPrice
          ),
          itemCount: order.products[0].quantity,
          deliveryCharge: 0,
          listPrice: Math.round(
            order.products[0].quantity * order.products[0]?.variantId?.price
          ),
          extraDiscount: Math.round(order.couponDiscount),
          price: Math.round(order.price),
          discountedPrice: Math.round(order.discountedPrice),
          payment_status: order.payment_status,
          appliedCoupon: order.appliedCoupon,
        },
        retrunDetails: order.return_details,
        order_status: order.order_status || "placed",
        order_date: order.createdAt,
        // return_date: addDaysToDate(order.createdAt, 6),
        retrun_status: order.return_status,
        shippingInfo: order.shippingInfo,
        products: order.products.map((product) => ({
          ...product,
          price: Math.round(product.price),
          discountedPrice: Math.round(product.discountedPrice),
          variationId: {
            ...product.variantId,
            discountedPrice: Math.round(product.variantId.discountedPrice),
          },
        })),
      };

      responseReturn(res, 200, {
        orderDetails: formattedOrders,
        message: "orders fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };

  get_order = async (req, res) => {
    const id = req.params.id;
    try {
      const order = await CusomerOrderModel.findById(id);
      responseReturn(res, 200, {
        order,
        message: "order fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };
  delete_order = async (req, res) => {
    const id = req.params.id;
    try {
      const order = await CusomerOrderModel.findOneAndDelete(id);
      responseReturn(res, 200, {
        order,
        message: "order fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };
  async update_order_status(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const order = await androidCustomerOrderModel.findOne(orderId);
      if (!order) {
        responseReturn(res, 200, { message: "order not found ", status: 404 });
      }
      const updatedOrder = await androidCustomerOrderModel.findOneAndUpdate(
        {
          _id: orderId,
        },
        {
          order_status: status,
        },
        { new: true }
      );
      responseReturn(res, 200, {
        message: "order status updated successfully",
        updatedOrder,
      });
    } catch (error) {
      console.log(error.message);
    }
  }
  generate_android_invoice = async (req, res) => {
    console.log("recieved hit");
    const company = {
      name: "Sphran",
      location: "dfthsif sfhsfjdf sfsdf dfsdfhsfs",
      pincode: 499999,
      gstIn: "fsdrerer3434434",
    };
    const seller = {
      name: "Dushyant",
      location: "dfthsif sfhsfjdf sfsdf dfsdfhsfs",
      pincode: 490023,
      phone: "9303844782",
    };
    const customer = {
      name: "Takesh",
      location: "dfthsif sfhsfjdf sfsdf dfsdfhsfs",
      pincode: 491885,
      phone: "7771906032",
    };
    const products = [
      {
        description: "Maxx T-shirt (Gray-XL)",
        Qty: 1,
        price: 4444.44,
        hsncode: 6109,
        discount: 0.0,
        taxable: 4444.44,
        gst: 18,
        gstAmount: (4444.44 * 18) / 100,
        total: 4444.44 - 0 + (4444.44 * 18) / 100,
      },
      {
        description: "Maxx T-shirt (Gray-XL)",
        Qty: 1,
        price: 100,
        hsncode: 6109,
        discount: 0.0,
        taxable: 100,
        gst: 18,
        gstAmount: (100 * 18) / 100,
        total: 100 - 0 + (100 * 18) / 100,
      },
    ];

    const shipping = {
      description: "Shipping",
      Qty: 0,
      price: 90,
      hsncode: 0,
      discount: 90,
      taxable: 0.0,
      gst: 0.0,
      gstAmount: (90 * 0) / 100,
      total: 90 - 90 + (90 * 0) / 100,
    };

    try {
      // Calculate totals
      let Qty = 0;
      let price = shipping.price;
      let discount = shipping.discount;
      let taxable = shipping.taxable;
      let gst = shipping.gst;
      let gstAmount = shipping.gstAmount;
      let total = shipping.total;

      products.forEach((item) => {
        gstAmount += (item.taxable * item.gst) / 100;
        Qty += item.Qty;
        price += item.price;
        discount += item.discount;
        taxable += item.taxable;

        total += item.taxable + (item.taxable * item.gst) / 100;
      });

      // Add shipping details
      total += shipping.price - shipping.discount;

      // Define totals object here
      const totals = {
        description: "Total",
        Qty: parseFloat(Qty.toFixed(0)),
        price: parseFloat(price.toFixed(2)),
        hsncode: 0,
        discount: parseFloat(discount.toFixed(2)),
        taxable: parseFloat(taxable.toFixed(2)),
        gstAmount: parseFloat(gstAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      };

      // Create response object
      const invoice = {
        company,
        seller,
        customer,
        products,
        shipping,
        totals,
      };

      const doc = new jsPDF();

      const logoPath = path.join(__dirname, "/indi-shoppe-2.png"); // Adjust the path
      const logoData = fs.readFileSync(logoPath, "base64"); // Read image as Base64
      // doc.addImage(logoData, "PNG", 150, 30, 50, 50); // Add image to PDF (adjust x, y, width, height)
      doc.setFontSize(20);
      doc.text("TAX INVOICE", 85, 20);

      doc.setFontSize(12);
      doc.text(`Invoice No: ${company.name}`, 16, 36);
      doc.text(`RRN: ${company.location}`, 16, 42);
      doc.text(`Date & Time: ${company.pincode}`, 16, 48);
      doc.text(`Order ID: ${company.gstIn}`, 16, 54);

      doc.setLineWidth(0.2);
      doc.rect(14, 58, 182, 25); // Adjust x, y, width, height for your content

      doc.text(`Company: ${company.name}`, 16, 62);
      doc.text(`Location: ${company.location}`, 16, 68);
      doc.text(`Pincode: ${company.pincode}`, 16, 74);
      doc.text(`GSTIN: ${company.gstIn}`, 16, 80);

      doc.setLineWidth(0.2);
      doc.rect(14, 85, 91, 39); // Adjust x, y, width, height for your content
      // Seller and Customer Information
      doc.text("Bill To :", 16, 90);
      doc.text(`Name: ${seller.name}`, 16, 96);
      doc.text(`Location: ${seller.location}`, 16, 102);
      doc.text(`                ${seller.location}`, 16, 108);
      doc.text(`Pincode: ${seller.pincode}`, 16, 114);
      doc.text(`Phone: ${seller.phone}`, 16, 120);

      doc.setLineWidth(0.2);
      doc.rect(105, 85, 91, 39);

      doc.text("Customer Information:", 107, 90);
      doc.text(`Name: ${customer.name}`, 107, 96);
      doc.text(`Location: ${customer.location}`, 107, 102);
      doc.text(`                 ${customer.location}`, 107, 108);

      doc.text(`Pincode: ${customer.pincode}`, 107, 114);
      doc.text(`Phone: ${customer.phone}`, 107, 120);

      const dataPro = [...products, shipping, totals];

      // Products Table
      const productRows = dataPro.map((product) => [
        product.description,
        product.Qty,
        product.price.toFixed(2),
        product.hsncode,
        product.discount,
        product.taxable.toFixed(2),
        product.gstAmount.toFixed(2),
        product.total.toFixed(2),
      ]);

      const grandTotal = totals.total.toFixed(2);

      const grandTotalRow = [
        {
          content: "Grand Total",
          styles: { halign: "left", fontStyle: "bold" },
        },
        {
          content: `Rs ${grandTotal}`,
          colSpan: 7,
          styles: { fontStyle: "bold", halign: "left", fontSize: 12 },
        },
      ];

      doc.autoTable({
        startY: 130,
        head: [
          [
            "Description",
            "Qty",
            "Price",
            "HSN Code",
            "Discount",
            "Taxable",
            "GST Amount",
            "Total",
          ],
        ],
        body: [...productRows, grandTotalRow],
        styles: { fontSize: 10 },
      });

      doc.text(
        `Declaration: This is a computer-generated invoice, no signature required.`,
        40,
        doc.internal.pageSize.height - 10
      );

      // Send PDF to client
      const pdfOutput = doc.output("arraybuffer");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");
      res.send(Buffer.from(pdfOutput));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message, success: false });
    }
  };
}
module.exports = new customerOrderController();
