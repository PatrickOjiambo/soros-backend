import nodemailer from "nodemailer";
import { env } from "../env";

const EMAIL_FROM = env.EMAIL_FROM;
const EMAIL_SERVER_HOST = env.EMAIL_SERVER_HOST;
const EMAIL_SERVER_PORT = env.EMAIL_SERVER_PORT;
const EMAIL_SERVER_USER = env.EMAIL_SERVER_USER;
const EMAIL_SERVER_PASSWORD = env.EMAIL_SERVER_PASSWORD;

const transporter = nodemailer.createTransport({
  host: EMAIL_SERVER_HOST,
  port: EMAIL_SERVER_PORT,
  secure: EMAIL_SERVER_PORT === 465,
  auth: {
    user: EMAIL_SERVER_USER,
    pass: EMAIL_SERVER_PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Mailer Configuration Error:", error);
  } else {
    console.log("Mailer is configured and ready to send emails.");
  }
});

export default transporter;
