import nodemailer from "nodemailer";
import "dotenv/config";

// .env dosyasından Brevo kimlik bilgilerini alıyoruz
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } =
  process.env;

// Nodemailer için bir "taşıyıcı" (transport) yapılandırması
// Hangi SMTP sunucusunun kullanılacağını belirtir
const transportConfig = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // Brevo için 587 portu TLS kullanır (secure: false)
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
};

// Yapılandırmayı kullanarak bir taşıyıcı oluştur
const transporter = nodemailer.createTransport(transportConfig);

/**
 * E-posta göndermek için genel bir yardımcı fonksiyon.
 * @param {object} mailOptions - E-posta seçenekleri
 * @param {string} mailOptions.to - Alıcının e-posta adresi
 * @param {string} mailOptions.subject - E-postanın konusu
 * @param {string} mailOptions.html - E-postanın HTML içeriği
 */
const sendEmail = async (mailOptions) => {
  try {
    // E-postayı gönder
    await transporter.sendMail({
      from: SMTP_FROM, // Gönderen (Brevo'da doğruladığınız mail)
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });
    console.log("Email has been successfully sent.");
  } catch (error) {
    console.error("Error sending email: ", error);
    // Görev Adım 3'te istenen hata mesajını fırlatıyoruz
    // Bu hatayı rotada (route) yakalayıp kullanıcıya göndereceğiz
    throw new Error("Failed to send the email, please try again later.");
  }
};

export default sendEmail;