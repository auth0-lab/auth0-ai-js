import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  port: parseInt(process.env.SMTP_PORT!, 10),
});
