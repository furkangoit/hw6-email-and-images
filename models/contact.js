import { Schema, model } from "mongoose";

const contactSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Set name for contact"],
    },
    email: {
      type: String,
      required: [true, "Set email for contact"],
    },
    phone: {
      type: String,
      required: [true, "Set phone for contact"],
    },
    favorite: {
      type: Boolean,
      default: false,
    },
    // =============================================
    // ADIM 6: YENİ ALANI BURAYA EKLEYİN
    // =============================================
    photo: {
      type: String, // Cloudinary'den gelen URL'yi burada saklayacağız
      default: null,
    },
    // =============================================
    owner: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { versionKey: false, timestamps: true }
);

export const Contact = model("contact", contactSchema);