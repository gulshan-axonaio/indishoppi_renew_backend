const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

const sendEmail = async (email, subject, payload, template) => {
  try {
    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const source = fs.readFileSync(path.join(__dirname, template), "utf8");
    const compiledTemplate = handlebars.compile(source);
    const options = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: subject,
      html: compiledTemplate(payload),
    };

    // Send email
    transporter.sendMail(options, (error, info) => {
      if (error) {
        console.log(error);
        return error;
      } else {
        `Email sent to ${email}: ${info.response}`;
      }
    });
    return true;
  } catch (error) {
    return error;
  }
};

const sendOrderConfirmationEmail = async (
  email,
  subject,
  products,
  template
) => {
  try {
    // Create reusable transporter object using the default SMTP transport
    console.log("sendig email x");
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Read and compile the email template
    const source = fs.readFileSync(path.join(__dirname, template), "utf8");
    const compiledTemplate = handlebars.compile(source);

    // Prepare product details in a format that can be used in the template
    const payload = {
      products,
      total: products.reduce((acc, product) => {
        const discountedPrice =
          product.price - (product.price * product.discount) / 100;
        return acc + discountedPrice * product.quantity;
      }, 0),
    };
    console.log("sendig email 2");

    const options = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: subject,
      html: compiledTemplate(payload),
    };

    // Send the email
    transporter.sendMail(options, (error, info) => {
      if (error) {
        console.log(error);
        return error;
      } else {
        console.log(`Email sent to ${email}: ${info.response}`);
      }
    });
    console.log("sendig email 3");

    return true;
  } catch (error) {
    console.log(error);
    return error;
  }
};

module.exports = { sendOrderConfirmationEmail, sendEmail };
