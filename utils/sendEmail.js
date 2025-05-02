import fs from "fs";
import handlebars from "handlebars";
import path from "path";
import nodemailer from "nodemailer";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Get the filename and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const sendEmail = async (email, subject, payload, template) => {
  try {
    console.log("sending email1");
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
    console.log("sending email2");

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
        console.log(error.message);
        return error;
      } else {
        `Email sent to ${email}: ${info.response}`;
      }
    });

    transporter.verify((error, success) => {
      if (error) {
        console.log("❌ SMTP Authentication Error: ", error);
      } else {
        console.log("✅ SMTP Authentication Enabled: Server is Ready!");
      }
    });
    return true;
  } catch (error) {
    console.log(error.message);
    return error;
  }
};
