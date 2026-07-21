const express = require("express");
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getOrderById,
  getOrdersByShop,
  updateOrderStatus,
  cancelMyOrder,
} = require("../controllers/orderController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.post("/", verifyToken, requireRole(["customer"]), placeOrder);
router.get("/mine", verifyToken, requireRole(["customer"]), getMyOrders);
router.patch("/:id/cancel", verifyToken, requireRole(["customer"]), cancelMyOrder);

router.get("/shop/:shopId", verifyToken, requireRole(["owner"]), getOrdersByShop);
router.patch("/:id/status", verifyToken, requireRole(["owner"]), updateOrderStatus);

router.get("/:id", verifyToken, getOrderById);

module.exports = router;
