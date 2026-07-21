const express = require("express");
const router = express.Router();
const { submitReview, getReviewsByShop, deleteReview } = require("../controllers/reviewController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.get("/shop/:shopId", getReviewsByShop);
router.post("/", verifyToken, requireRole(["customer"]), submitReview);
router.delete("/:id", verifyToken, requireRole(["customer"]), deleteReview);

module.exports = router;
