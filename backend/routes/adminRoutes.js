const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  listShops,
  verifyShop,
  deleteShop,
  bulkUploadProducts
} = require("../controllers/adminController");
const { verifyToken, requireRole } = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/shops", verifyToken, requireRole(["admin"]), listShops);
router.patch("/shops/:id/verify", verifyToken, requireRole(["admin"]), verifyShop);
router.post(
  "/products/bulk-upload",
  verifyToken,
  requireRole(["admin"]),
  upload.single("file"),
  bulkUploadProducts
);
router.delete(
  "/shops/:id",
  verifyToken,
  requireRole(["admin"]),
  deleteShop
);

module.exports = router;
