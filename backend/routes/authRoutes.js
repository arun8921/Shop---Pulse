const express = require("express");
const router = express.Router();
const { register, login, getProfile, updateProfile } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getProfile);
router.patch("/me", verifyToken, updateProfile);

module.exports = router;
