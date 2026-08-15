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
  resubmitVerification,
  getShopDocument,
} = require("../controllers/shopController");
const { verifyToken, requireRole } = require("../middleware/auth");
const { handleDocumentUpload } = require("../middleware/upload");

router.get("/nearby", getNearbyShops);
router.get("/status", getShopStatuses);
router.get("/categories", getCategories);

router.post("/", verifyToken, requireRole(["owner"]), handleDocumentUpload, createShop);
router.get("/mine/summary", verifyToken, requireRole(["owner"]), getOwnerSummary);
router.get("/mine", verifyToken, requireRole(["owner"]), getMyShops);
router.patch("/:id", verifyToken, requireRole(["owner"]), updateShopDetails);
router.patch("/:id/status", verifyToken, requireRole(["owner"]), updateShopStatus);
router.patch("/:id/status/automatic",verifyToken,requireRole(["owner"]),resetShopStatusToAutomatic);
router.post("/:id/resubmit-verification", verifyToken, requireRole(["owner"]), handleDocumentUpload, resubmitVerification);
router.get("/:id/document", verifyToken, getShopDocument);
router.get("/:id", getShopById);

module.exports = router;

