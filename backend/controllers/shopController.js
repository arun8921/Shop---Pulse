const db = require("../config/db");

async function createShop(req, res) {
  try {
    const { name, category_id, address, latitude, longitude, contact_number } = req.body;
    const owner_id = req.user.user_id;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Shop name, latitude, and longitude are required." });
    }

    const [result] = await db.query(
      `INSERT INTO shops (owner_id, name, category_id, address, latitude, longitude, contact_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [owner_id, name, category_id || null, address || null, latitude, longitude, contact_number || null]
    );

    return res.status(201).json({ message: "Shop registered successfully.", shop_id: result.insertId });
  } catch (err) {
    console.error("Create shop error:", err);
    return res.status(500).json({ message: "Something went wrong while registering the shop." });
  }
}

async function getMyShops(req, res) {
  try {
    const [rows] = await db.query("SELECT * FROM shops WHERE owner_id = ?", [req.user.user_id]);
    return res.json({ shops: rows });
  } catch (err) {
    console.error("Get my shops error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function updateShopStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'open' or 'closed'." });
    }

    const [shopRows] = await db.query("SELECT owner_id FROM shops WHERE shop_id = ?", [id]);
    if (shopRows.length === 0) {
      return res.status(404).json({ message: "Shop not found." });
    }
    if (shopRows[0].owner_id !== req.user.user_id) {
      return res.status(403).json({ message: "You do not own this shop." });
    }

    await db.query(
      "UPDATE shops SET current_status = ?, is_manually_overridden = TRUE WHERE shop_id = ?",
      [status, id]
    );

    return res.json({ message: `Shop marked as ${status}.` });
  } catch (err) {
    console.error("Update shop status error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function getNearbyShops(req, res) {
  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng query parameters are required." });
    }

    const searchRadius = radius ? parseFloat(radius) : 3;

    const query = `
      SELECT shop_id, name, address, latitude, longitude, current_status, last_updated,
        ( 6371 * acos(
            cos(radians(?)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(latitude))
        ) ) AS distance_km
      FROM shops
      HAVING distance_km <= ?
      ORDER BY distance_km ASC
    `;

    const [rows] = await db.query(query, [lat, lng, lat, searchRadius]);
    return res.json({ shops: rows });
  } catch (err) {
    console.error("Get nearby shops error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function getShopStatuses(req, res) {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ message: "ids query parameter is required (comma-separated)." });
    }
    const idList = ids.split(",").map((id) => parseInt(id, 10)).filter(Boolean);
    if (idList.length === 0) {
      return res.json({ shops: [] });
    }

    const placeholders = idList.map(() => "?").join(",");
    const [rows] = await db.query(
      `SELECT shop_id, current_status, last_updated FROM shops WHERE shop_id IN (${placeholders})`,
      idList
    );
    return res.json({ shops: rows });
  } catch (err) {
    console.error("Get shop statuses error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = { createShop, getMyShops, updateShopStatus, getNearbyShops, getShopStatuses };
