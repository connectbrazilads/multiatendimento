const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');
const { getSettings, saveSettings, getBusinessHours, saveBusinessHours, uploadLogo } = require('../controllers/settingsController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { uploadsPath } = require('../utils/uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens nos formatos PNG, JPG ou JPEG são permitidas.'));
    }
  }
});

router.use(authenticate);
router.get('/', getSettings);
router.post('/', isAdmin, saveSettings);
router.get('/business-hours', getBusinessHours);
router.post('/business-hours', isAdmin, saveBusinessHours);
router.post('/logo', isAdmin, upload.single('file'), uploadLogo);

module.exports = router;
