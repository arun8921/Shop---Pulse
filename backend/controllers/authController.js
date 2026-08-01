const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const {
  ensureOnlyFields,
  hasOwn,
  normalizeEmail,
  normalizePassword,
  normalizePhone,
  requiredText,
  respondWithError,
} = require("../utils/validation");
require("dotenv").config();

const SALT_ROUNDS = 10;
const PUBLIC_ROLES = ["customer", "owner"];

function createToken(user) {
  return jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
  };
}

async function register(req, res) {
  try {
    ensureOnlyFields(req.body, ["name", "email", "password", "role", "phone"]);

    const name = requiredText(req.body.name, "Name", { min: 2, max: 100 });
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);
    const phone = normalizePhone(req.body.phone);
    const role = req.body.role === undefined ? "customer" : req.body.role;

    if (!PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({
        message: "Public registration is available only for customer and owner accounts.",
      });
    }

    const [existing] = await db.query("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)",
      [name, email, passwordHash, role, phone]
    );

    const user = { user_id: result.insertId, name, email, role, phone };
    return res.status(201).json({
      message: "Registration successful.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong during registration.", "Register error:");
  }
}

async function login(req, res) {
  try {
    ensureOnlyFields(req.body, ["email", "password"]);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    if (typeof password !== "string" || password.length === 0 || password.length > 72) {
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

    return res.json({
      message: "Login successful.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong during login.", "Login error:");
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
    return respondWithError(res, err, "Something went wrong.", "Get profile error:");
  }
}

async function updateProfile(req, res) {
  try {
    ensureOnlyFields(req.body, ["name", "phone", "password", "current_password"]);

    const wantsPasswordChange = hasOwn(req.body, "password") || hasOwn(req.body, "current_password");
    if (wantsPasswordChange && (!hasOwn(req.body, "password") || !hasOwn(req.body, "current_password"))) {
      return res.status(400).json({
        message: "Provide both password and current_password to change your password.",
      });
    }

    if (!hasOwn(req.body, "name") && !hasOwn(req.body, "phone") && !wantsPasswordChange) {
      return res.status(400).json({ message: "Provide at least one profile field to update." });
    }

    const [userRows] = await db.query(
      "SELECT user_id, name, email, role, phone, password_hash, created_at FROM users WHERE user_id = ?",
      [req.user.user_id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const fields = [];
    const values = [];

    if (hasOwn(req.body, "name")) {
      fields.push("name = ?");
      values.push(requiredText(req.body.name, "Name", { min: 2, max: 100 }));
    }
    if (hasOwn(req.body, "phone")) {
      fields.push("phone = ?");
      values.push(normalizePhone(req.body.phone));
    }
    if (wantsPasswordChange) {
      const currentPassword = req.body.current_password;
      if (typeof currentPassword !== "string" || currentPassword.length === 0 || currentPassword.length > 72) {
        return res.status(400).json({ message: "Current password is required." });
      }
      const isMatch = await bcrypt.compare(currentPassword, userRows[0].password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }
      fields.push("password_hash = ?");
      values.push(await bcrypt.hash(normalizePassword(req.body.password, "New password"), SALT_ROUNDS));
    }

    values.push(req.user.user_id);
    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`, values);

    const [updatedRows] = await db.query(
      "SELECT user_id, name, email, role, phone, created_at FROM users WHERE user_id = ?",
      [req.user.user_id]
    );
    return res.json({ message: "Profile updated successfully.", user: updatedRows[0] });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong while updating your profile.", "Update profile error:");
  }
}

module.exports = { register, login, getProfile, updateProfile };
