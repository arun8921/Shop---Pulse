const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("../config/db");
require("dotenv").config();

const SALT_ROUNDS = 10;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const [rows] = await db.query("SELECT user_id, name, email FROM users WHERE email = ?", [email]);

    const genericResponse = {
      message: "If an account with that email exists, a password reset link has been sent.",
    };

    if (rows.length === 0) {
      return res.json(genericResponse);
    }

    const user = rows[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE user_id = ?",
      [hashedToken, expires, user.user_id]
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password/${rawToken}`;

    const transporter = getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: "Reset your Shop-Pulse password",
          html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
        });
      } catch (mailErr) {
        console.error("Failed to send reset email:", mailErr);
      }
      return res.json(genericResponse);
    }

    console.log(`Password reset link for ${user.email}: ${resetLink}`);
    return res.json({
      ...genericResponse,
      dev_reset_link: resetLink,
      dev_note: "SMTP is not configured, so this link is included directly for local testing. Remove this before deploying for real users.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const [rows] = await db.query(
      "SELECT user_id, reset_token_expires FROM users WHERE reset_token = ?",
      [hashedToken]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "This reset link is invalid or has already been used." });
    }

    const user = rows[0];
    if (new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.query(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_id = ?",
      [passwordHash, user.user_id]
    );

    return res.json({ message: "Your password has been reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

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
async function updateProfile(req, res) {
  try {
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    const [result] = await db.query(
      "UPDATE users SET name = ?, phone = ? WHERE user_id = ?",
      [name, phone || null, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const [rows] = await db.query(
      "SELECT user_id, name, email, role, phone, created_at FROM users WHERE user_id = ?",
      [req.user.user_id]
    );

    return res.json({
      message: "Profile updated successfully.",
      user: rows[0],
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}
module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
};