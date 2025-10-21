const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'avin',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [
            { quality: "auto:low", fetch_format: "auto" }
        ]
    },
}); 


const upload = multer({ storage });

module.exports = upload;
