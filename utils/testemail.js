import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config(); 

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT);

console.log({ MAIL_USER, MAIL_PASS, SMTP_HOST, SMTP_PORT });

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS
  }
});

export async function sendMail({ to, subject, html, text }) {
  try {
    await transporter.verify();
    console.log("Transporter verified OK!");
    return transporter.sendMail({
      from: `"Calzados" <${MAIL_USER}>`,
      to,
      subject,
      html,
      text
    });
  } catch (err) {
    console.error("Error al enviar el correo:", err);
  }
}