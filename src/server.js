// ---------------------------------
// Gerekli Kütüphanelerin Yüklenmesi
// ---------------------------------
const express = require('express');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs'); // Dosya silmek için (File System)

// .env dosyasındaki gizli bilgileri yükler
// (Bu dosya ana dizinde olmalı)
require('dotenv').config();

// ---------------------------------
// Express Uygulama Kurulumu
// ---------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// Formdan gelen 'email' gibi metin verilerini okuyabilmek için:
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------------------------
// Multer (Dosya Yükleme) Yapılandırması
// ---------------------------------
// Dosyaların 'src/uploads/' klasörüne kaydedilmesini sağlıyoruz
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    
    // 'uploads' klasörü yoksa oluştur
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir);
    }
    
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    // Dosya adını benzersiz yapıyoruz
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Multer yapılandırmasını 'upload' değişkenine atıyoruz
const upload = multer({ storage: storage });

// ---------------------------------
// Nodemailer (E-posta Gönderici) Yapılandırması
// ---------------------------------
// .env dosyasından alınan bilgilerle Gmail servisi kullanılıyor
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, // .env dosyasından
    pass: process.env.EMAIL_PASS  // .env dosyasından (Google Uygulama Şifresi)
  }
});

// ---------------------------------
// Rotalar (Endpoints)
// ---------------------------------

/**
 * @route GET /
 * @description Ana HTML form sayfasını sunar.
 */
app.get('/', (req, res) => {
  // server.js ile aynı dizinde (src) olan index.html'i gönder
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * @route POST /upload
 * @description Formdan gelen resmi alır, e-posta olarak gönderir ve resmi siler.
 */
// 'async' kullanıyoruz çünkü e-posta gönderme işlemi zaman alır (await)
app.post('/upload', upload.single('image'), async (req, res) => {
  
  // 1. Gelen Verileri Kontrol Et
  if (!req.file || !req.body.email) {
    return res.status(400).send('E-posta ve resim dosyası gerekli.');
  }

  // 2. Değişkenleri Ata
  const { filename, path: filePath } = req.file; // filePath: 'src/uploads/12345-resim.jpg'
  const recipientEmail = req.body.email;       // Alıcı e-posta adresi

  console.log(`İşlem başladı: ${filename} dosyası ${recipientEmail} adresine gönderilecek.`);

  // 3. E-posta Seçeneklerini Hazırla
  const mailOptions = {
    from: `"Proje Mentör" <${process.env.EMAIL_USER}>`, // Gönderici adı ve adresi
    to: recipientEmail, // Alıcı
    subject: 'Resim Yükleme Projesi - Dosyanız Ekte!', // Konu
    html: `
      <h3>Merhaba,</h3>
      <p>Yüklediğiniz resim dosyası (<b>${filename}</b>) ektedir.</p>
      <p>İyi günler dileriz.</p>
    `,
    attachments: [
      {
        filename: filename, // Ek dosyanın adı
        path: filePath      // Ek dosyanın sunucudaki tam yolu
      }
    ]
  };

  // 4. E-postayı Göndermeyi Dene
  try {
    await transporter.sendMail(mailOptions);
    console.log('E-posta başarıyla gönderildi.');

    // 5. Başarılıysa HTML yanıtı gönder
    res.send(`
      <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h1>Başarılı!</h1>
        <p>Resminiz başarıyla <b>${recipientEmail}</b> adresine gönderildi.</p>
        <a href="/">Yeni bir resim gönder</a>
      </body>
    `);

  } catch (error) {
    // 6. Hata olursa sunucuya logla ve kullanıcıya hata mesajı göster
    console.error('E-posta gönderim hatası:', error);
    res.status(500).send('E-posta gönderilirken bir hata oluştu. Lütfen sunucu loglarını kontrol edin.');
  } finally {
    // 7. (Temizlik) E-posta gönderimi başarılı da olsa, başarısız da olsa
    // sunucuya yüklenen geçici dosyayı sil.
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Geçici dosya silinirken hata oluştu:', err);
      } else {
        console.log(`Geçici dosya silindi: ${filePath}`);
      }
    });
  }
});

// ---------------------------------
// Sunucuyu Başlatma
// ---------------------------------
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
});