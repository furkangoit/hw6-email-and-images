// backend/index.js (TAM VE BİRLEŞTİRİLMİŞ HALİ)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import createHttpError from "http-errors";

// --- MODELLER ---
import { User } from "./models/user.js"; // HW5-AUTH'tan gelmeli
import { Contact } from "./models/contact.js"; // Adım 6'da ekledik

// --- YARDIMCILAR (HELPERS) ---
import sendEmail from "./helpers/sendEmail.js"; // Adım 3'te ekledik

// --- ARA KATMANLAR (MIDDLEWARES) ---
import validateBody from "./middlewares/validateBody.js"; // HW5-AUTH'tan gelmeli
import isValidId from "./middlewares/isValidId.js"; // Adım 6'da ekledik
import authenticate from "./middlewares/authenticate.js"; // HW5-AUTH'tan gelmeli
import upload from "./middlewares/upload.js"; // Adım 6'da ekledik

// --- JOI ŞEMALARI ---
import {
  // Auth Şemaları
  registerSchema, // HW5-AUTH'tan gelmeli
  loginSchema, // HW5-AUTH'tan gelmeli
  // Parola Sıfırlama Şemaları (Adım 3 & 4)
  sendResetEmailSchema,
  resetPasswordSchema,
  // Contact Şemaları (Adım 6)
  addContactSchema,
  updateContactSchema,
  updateFavoriteSchema,
} from "./schemas/users.js"; // (Dosya adınız farklıysa düzeltin)

// .env değişkenlerini yükle
dotenv.config();

const { DB_HOST, PORT = 3000, JWT_SECRET, APP_DOMAIN } = process.env;

const app = express();

// Genel Middleware'ler
app.use(cors());
app.use(express.json());

// ===============================================
// AUTH ROTLARI (HW5-AUTH)
// ===============================================
// (NOT: Bu rotaların içeriğinin sizde olduğunu varsayıyorum)
// app.post("/auth/register", validateBody(registerSchema), async (req, res, next) => { ... });
// app.post("/auth/login", validateBody(loginSchema), async (req, res, next) => { ... });
// app.get("/auth/current", authenticate, async (req, res, next) => { ... });
// app.post("/auth/logout", authenticate, async (req, res, next) => { ... });

// ===============================================
// PAROLA SIFIRLAMA ROTLARI (ADIM 3 & 4)
// ===============================================
app.post(
  "/auth/send-reset-email",
  validateBody(sendResetEmailSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) throw createHttpError(404, "User not found!");
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "5m" });
      const resetLink = `${APP_DOMAIN}/reset-password?token=${token}`;
      const emailHtml = `<h1>Parola Sıfırlama</h1><p>Sıfırlamak için <a href="${resetLink}">linke</a> tıklayın.</p>`;
      await sendEmail({ to: email, subject: "Parola Sıfırlama", html: emailHtml });
      res.status(200).json({ status: 200, message: "Reset password email has been successfully sent.", data: {} });
    } catch (error) {
      if (error.message.includes("Failed to send")) return next(createHttpError(500, error.message));
      next(error);
    }
  }
);

app.post(
  "/auth/reset-pwd",
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, password } = req.body;
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        throw createHttpError(401, "Token is expired or invalid.");
      }
      const user = await User.findOne({ email: payload.email });
      if (!user) throw createHttpError(404, "User not found!");
      
      user.password = password; // (Modelinizde pre-save hook'u olduğunu varsayarak)
      user.token = null;
      await user.save();
      
      res.status(200).json({ status: 200, message: "Password has been successfully reset.", data: {} });
    } catch (error) {
      next(error);
    }
  }
);

// ===============================================
// CONTACTS API ROTLARI (ADIM 6 GÜNCELLENDİ)
// ===============================================
app.get("/contacts", authenticate, async (req, res, next) => {
  try {
    const contacts = await Contact.find({ owner: req.user._id });
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/contacts",
  authenticate,
  upload.single("photo"), // Resim yükleme
  validateBody(addContactSchema),
  async (req, res, next) => {
    try {
      const photoUrl = req.file ? req.file.path : null;
      const newContact = await Contact.create({
        ...req.body,
        photo: photoUrl,
        owner: req.user._id,
      });
      res.status(201).json(newContact);
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/contacts/:contactId",
  authenticate,
  isValidId,
  upload.single("photo"), // Resim yükleme
  validateBody(updateContactSchema),
  async (req, res, next) => {
    try {
      const { contactId } = req.params;
      const updateData = { ...req.body };
      if (req.file) {
        updateData.photo = req.file.path;
      }
      const updatedContact = await Contact.findOneAndUpdate(
        { _id: contactId, owner: req.user._id },
        updateData,
        { new: true }
      );
      if (!updatedContact) throw createHttpError(404, "Contact not found");
      res.json(updatedContact);
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/contacts/:contactId/favorite",
  authenticate,
  isValidId,
  validateBody(updateFavoriteSchema),
  async (req, res, next) => {
    try {
      const { contactId } = req.params;
      const { favorite } = req.body;
      const updatedContact = await Contact.findOneAndUpdate(
        { _id: contactId, owner: req.user._id },
        { favorite },
        { new: true }
      );
      if (!updatedContact) throw createHttpError(404, "Contact not found");
      res.json(updatedContact);
    } catch (error) {
      next(error);
    }
  }
);

// ===============================================
// HATA İŞLEYİCİLER (ERROR HANDLERS)
// ===============================================
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  const { status = 500, message = "Server error" } = err;
  res.status(status).json({ message });
});

// ===============================================
// VERİTABANI BAĞLANTISI VE SUNUCU BAŞLATMA
// ===============================================
mongoose.connect(DB_HOST)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Database connection successful. Server is running on port: ${PORT}`);
    });
  })
  .catch(error => {
    console.error(error.message);
    process.exit(1);
  });