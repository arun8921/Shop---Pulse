const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  listShops,
  verifyShop,
  rejectShop,
  deleteShop,
  listUsers
} = require("../controllers/adminController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.get("/users", verifyToken, requireRole(["admin"]), listUsers);
router.get("/shops", verifyToken, requireRole(["admin"]), listShops);
router.patch("/shops/:id/verify", verifyToken, requireRole(["admin"]), verifyShop);
router.patch(
  "/shops/:id/reject",
  verifyToken,
  requireRole(["admin"]),
  rejectShop
);

router.delete(
  "/shops/:id",
  verifyToken,
  requireRole(["admin"]),
  deleteShop
);

module.exports = router;
