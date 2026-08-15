const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "documents");

// Ensure the directory tree exists at require-time.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error("Only JPEG, PNG, WebP images and PDF documents are allowed."));
}

const documentUpload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

/**
 * Express middleware that runs multer for a single "document" field and
 * translates multer errors into clean JSON 400 responses.
 */
function handleDocumentUpload(req, res, next) {
  documentUpload.single("document")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File size must not exceed 5 MB."
          : err.message || "File upload failed.";
      return res.status(400).json({ message });
    }
    next();
  });
}

module.exports = { handleDocumentUpload, UPLOAD_DIR };
