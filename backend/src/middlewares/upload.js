const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { mediaPath } = require('../utils/uploads');

const storage = multer.diskStorage({
  destination: mediaPath,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

module.exports = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB
