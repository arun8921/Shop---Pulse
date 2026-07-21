const express = require("express");
const router = express.Router();
const {
  createShop,
  getMyShops,
  updateShopStatus,
  getNearbyShops,
  getShopStatuses,
} = require("../controllers/shopController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.get("/nearby", getNearbyShops);
router.get("/status", getShopStatuses);

router.post("/", verifyToken, requireRole(["owner"]), createShop);
router.get("/mine", verifyToken, requireRole(["owner"]), getMyShops);
router.patch("/:id/status", verifyToken, requireRole(["owner"]), updateShopStatus);

module.exports = router;
