const express = require("express");
const router = express.Router();
const {
  createShop,
  getMyShops,
  updateShopDetails,
  updateShopStatus,
  resetShopStatusToAutomatic,
  getNearbyShops,
  getShopStatuses,
  getCategories,
  getShopById,
  getOwnerSummary,
} = require("../controllers/shopController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.get("/nearby", getNearbyShops);
router.get("/status", getShopStatuses);
router.get("/categories", getCategories);

router.post("/", verifyToken, requireRole(["owner"]), createShop);
router.get("/mine/summary", verifyToken, requireRole(["owner"]), getOwnerSummary);
router.get("/mine", verifyToken, requireRole(["owner"]), getMyShops);
router.patch("/:id", verifyToken, requireRole(["owner"]), updateShopDetails);
router.patch("/:id/status", verifyToken, requireRole(["owner"]), updateShopStatus);
router.patch("/:id/status/automatic",verifyToken,requireRole(["owner"]),resetShopStatusToAutomatic);
router.get("/:id", getShopById);

module.exports = router;
