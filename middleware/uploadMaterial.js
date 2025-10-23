const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const materialStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'materials',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [
      { quality: "auto:low", fetch_format: "auto" }
    ],
  },
});

const uploadMaterial = multer({ storage: materialStorage });
module.exports = uploadMaterial;
