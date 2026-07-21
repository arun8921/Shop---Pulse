const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProductsByShop,
  getMyProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
} = require("../controllers/productController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.get("/search", searchProducts);
router.get("/shop/:shopId", getProductsByShop);

router.post("/", verifyToken, requireRole(["owner"]), createProduct);
router.get("/mine", verifyToken, requireRole(["owner"]), getMyProducts);
router.patch("/:id", verifyToken, requireRole(["owner"]), updateProduct);
router.delete("/:id", verifyToken, requireRole(["owner"]), deleteProduct);

module.exports = router;
