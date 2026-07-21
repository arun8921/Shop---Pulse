const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
require("dotenv").config();

const SALT_ROUNDS = 10;

async function register(req, res) {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    const allowedRoles = ["customer", "owner", "admin"];
    const finalRole = allowedRoles.includes(role) ? role : "customer";

    const [existing] = await db.query("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)",
      [name, email, passwordHash, finalRole, phone || null]
    );

    const token = jwt.sign(
      { user_id: result.insertId, role: finalRole },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Registration successful.",
      token,
      user: { user_id: result.insertId, name, email, role: finalRole },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Something went wrong during registration." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful.",
      token,
      user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Something went wrong during login." });
  }
}

async function getProfile(req, res) {
  try {
    const [rows] = await db.query(
      "SELECT user_id, name, email, role, phone, created_at FROM users WHERE user_id = ?",
      [req.user.user_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = { register, login, getProfile };
