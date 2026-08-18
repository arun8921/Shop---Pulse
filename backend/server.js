const express = require("express");
const cors = require("cors");
require("dotenv").config();

const fs = require("fs");
const path = require("path");

// Ensure uploads directory exists on startup.
const uploadsDir = path.join(__dirname, "uploads", "documents");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const authRoutes = require("./routes/authRoutes");
const shopRoutes = require("./routes/shopRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");

const { syncAutomaticShopStatuses } = require("./controllers/shopController");

const app = express();

app.use(cors());
app.use(express.json());

// Prevent browser caching for all API requests to ensure live statuses update immediately on refresh
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "Shop-Pulse API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Shop-Pulse backend running on http://localhost:${PORT}`);
});

syncAutomaticShopStatuses();

setInterval(() => {
  syncAutomaticShopStatuses();
}, 30000);
