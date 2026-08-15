const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createProduct,
  getProductsByShop,
  getMyProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
  bulkUploadProducts,
  downloadCsvTemplate,
} = require("../controllers/productController");
const { verifyToken, requireRole } = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/search", searchProducts);
router.get("/shop/:shopId", getProductsByShop);

router.post("/", verifyToken, requireRole(["owner"]), createProduct);
router.get("/mine", verifyToken, requireRole(["owner"]), getMyProducts);
router.patch("/:id", verifyToken, requireRole(["owner"]), updateProduct);
router.delete("/:id", verifyToken, requireRole(["owner"]), deleteProduct);

// CSV bulk upload for owners
router.get("/csv-template", verifyToken, requireRole(["owner"]), downloadCsvTemplate);
router.post(
  "/bulk-upload",
  verifyToken,
  requireRole(["owner"]),
  upload.single("file"),
  bulkUploadProducts
);

module.exports = router;
