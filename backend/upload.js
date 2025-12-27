const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".mp4");
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== ".mp4") {
    return cb(new Error("Hanya file MP4 yang diperbolehkan"));
  }
  cb(null, true);
};

module.exports = multer({ storage, fileFilter });
