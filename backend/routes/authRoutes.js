const express = require("express");
const router = express.Router();
const { register, login, getProfile, updateProfile, forgotPassword, resetPassword } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getProfile);
router.patch("/me", verifyToken, updateProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
