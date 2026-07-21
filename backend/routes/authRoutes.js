const express = require("express");
const router = express.Router();
const { register, login, getProfile } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getProfile);

module.exports = router;
