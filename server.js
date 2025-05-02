const express = require("express");
const { dbConnect } = require("./utiles/db");
const app = express();
const cors = require("cors");
const http = require("http");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require("dotenv").config();
// const cloudinary = require("cloudinary").v2;
const socket = require("socket.io");
const multerS3 = require("multer-s3");
const multer = require("multer");
const { S3Client } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const {
  sendfirebaseNotification,
} = require("./controllers/firebaseController.js");
const {
  fetchNotifications,
  readNotification,
} = require("./controllers/notifications.js");
const {
  authMiddleware,
  customerMiddleware,
} = require("./middlewares/authMiddleware.js");
const helmet = require("helmet");
const morgan = require("morgan");

const server = http.createServer(app);

console.log(process.env.FRONTEND, process.env.DASHBOARD);
app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.FRONTEND,
      process.env.DASHBOARD,
      "http://localhost:4001",
      "http://localhost:4002",
      "http://172.16.4.55:4001/",
    ],

    credentials: true,
  })
);

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: "public-read",
    contentType: (req, file, cb) => {
      cb(null, file.mimetype);
    },
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const timestamp = Date.now();
      const uniqueId = uuidv4();
      cb(null, `${timestamp}_${uniqueId}_${file.originalname}`);
    },
  }),
});

// cloudinary.config({
//   cloud_name: process.env.cloud_name,
//   api_key: process.env.api_key,
//   api_secret: process.env.api_secret,
//   secure: true,
// });
const io = socket(server, {
  cors: {
    origin: [process.env.DASHBOARD, process.env.FRONTEND],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

var allCustomer = [];
var allSeller = [];

const addUser = (customerId, socketId, userInfo) => {
  const checkUser = allCustomer.some((u) => u.customerId === customerId);
  if (!checkUser) {
    allCustomer.push({
      customerId,
      socketId,
      userInfo,
    });
  }
};

const addSeller = (sellerId, socketId, userInfo) => {
  const chaeckSeller = allSeller.some((u) => u.sellerId === sellerId);
  if (!chaeckSeller) {
    allSeller.push({
      sellerId,
      socketId,
      userInfo,
    });
  }
};

const findCustomer = (customerId) => {
  return allCustomer.find((c) => c.customerId === customerId);
};
const findSeller = (sellerId) => {
  return allSeller.find((c) => c.sellerId === sellerId);
};

const remove = (socketId) => {
  allCustomer = allCustomer.filter((c) => c.socketId !== socketId);
  allSeller = allSeller.filter((c) => c.socketId !== socketId);
};

let admin = {};

const removeAdmin = (socketId) => {
  if (admin.socketId === socketId) {
    admin = {};
  }
};

io.on("connection", (soc) => {
  console.log("socket server is connected...");

  soc.on("add_user", (customerId, userInfo) => {
    addUser(customerId, soc.id, userInfo);
    io.emit("activeSeller", allSeller);
    io.emit("activeCustomer", allCustomer);
  });
  soc.on("add_seller", (sellerId, userInfo) => {
    addSeller(sellerId, soc.id, userInfo);
    io.emit("activeSeller", allSeller);
    io.emit("activeCustomer", allCustomer);
    io.emit("activeAdmin", { status: true });
  });

  soc.on("add_admin", (adminInfo) => {
    delete adminInfo.email;
    admin = adminInfo;
    admin.socketId = soc.id;
    io.emit("activeSeller", allSeller);
    io.emit("activeAdmin", { status: true });
  });

  soc.on("send_seller_message", (msg) => {
    const customer = findCustomer(msg.receverId);
    if (customer !== undefined) {
      soc.to(customer.socketId).emit("seller_message", msg);
    }
  });

  soc.on("send_customer_message", (msg) => {
    const seller = findSeller(msg.receverId);
    if (seller !== undefined) {
      soc.to(seller.socketId).emit("customer_message", msg);
    }
  });

  soc.on("send_message_admin_to_seller", (msg) => {
    const seller = findSeller(msg.receverId);
    if (seller !== undefined) {
      soc.to(seller.socketId).emit("receved_admin_message", msg);
    }
  });

  soc.on("send_message_seller_to_admin", (msg) => {
    if (admin.socketId) {
      soc.to(admin.socketId).emit("receved_seller_message", msg);
    }
  });

  soc.on("disconnect", () => {
    console.log("user disconnect");
    remove(soc.id);
    removeAdmin(soc.id);
    io.emit("activeAdmin", { status: false });
    io.emit("activeSeller", allSeller);
    io.emit("activeCustomer", allCustomer);
  });
});

app.use(bodyParser.json());
app.use(cookieParser());

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Image upload failed!" });
  }
  res.json({ imageUrl: req.file.location });
});

app.post("/api/uploadMultiple", upload.array("images", 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Images upload failed!" });
  }
  const imageUrls = req.files.map((file) => file.location);
  res.json({ imageUrls });
});

app.use("/api", require("./routes/chatRoutes"));
app.use("/api", require("./routes/paymentRoutes"));
app.use("/api", require("./routes/dashboard/variants/variants"));

app.use("/api", require("./routes/dashboard/dashboardIndexRoutes"));
app.use("/api/admin", require("./routes/bannerRoutes.js"));
app.use("/api/home", require("./routes/home/homeRoutes"));
app.use("/api", require("./routes/authRoutes"));
app.use("/api", require("./routes/order/orderRoutes"));
app.use("/api", require("./routes/refund/refundRoutes.js"));

app.use("/api", require("./routes/order/adndroidOrderRoutes.js"));

app.use("/api", require("./routes/home/cardRoutes"));
app.use("/api", require("./routes/home/customerAuthRoutes"));
app.use("/api/admin", require("./routes/dashboard/adminRoutes.js"));

app.use("/api", require("./routes/dashboard/sellerRoutes"));
app.use("/api", require("./routes/dashboard/categoryRoutes"));
app.use("/api", require("./routes/dashboard/helpCenterRoutes.js"));

app.use("/api", require("./routes/dashboard/subcategoryRoutes"));
app.use("/api", require("./routes/dashboard/productRoutes"));
app.use("/api", require("./routes/dashboard/keyRoutes.js"));
app.get("/", (req, res) => res.send("Hello Wworld!"));

/**
 *
 *  @Notifications
 *
 */
app.post("/send-notification", sendfirebaseNotification);
app.get("/notifications", customerMiddleware, fetchNotifications);
app.patch("/notifications/:id/mark-read", readNotification);
const port = process.env.PORT;
dbConnect();
server.listen(port, () => console.log(`Server is running on port ${port}!`));
