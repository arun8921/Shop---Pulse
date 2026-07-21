const db = require("../config/db");

async function ownerOwnsShop(shopId, ownerId) {
  const [rows] = await db.query("SELECT owner_id FROM shops WHERE shop_id = ?", [shopId]);
  if (rows.length === 0) return { exists: false, owns: false };
  return { exists: true, owns: rows[0].owner_id === ownerId };
}

async function createProduct(req, res) {
  try {
    const { shop_id, name, price, availability_status } = req.body;
    const owner_id = req.user.user_id;

    if (!shop_id || !name || price === undefined) {
      return res.status(400).json({ message: "shop_id, name, and price are required." });
    }

    const { exists, owns } = await ownerOwnsShop(shop_id, owner_id);
    if (!exists) {
      return res.status(404).json({ message: "Shop not found." });
    }
    if (!owns) {
      return res.status(403).json({ message: "You do not own this shop." });
    }

    const status = ["available", "out_of_stock", "few_left"].includes(availability_status)
      ? availability_status
      : "available";

    const [result] = await db.query(
      "INSERT INTO products (shop_id, name, price, availability_status) VALUES (?, ?, ?, ?)",
      [shop_id, name, price, status]
    );

    return res.status(201).json({ message: "Product added successfully.", product_id: result.insertId });
  } catch (err) {
    console.error("Create product error:", err);
    return res.status(500).json({ message: "Something went wrong while adding the product." });
  }
}

async function getProductsByShop(req, res) {
  try {
    const { shopId } = req.params;
    const [rows] = await db.query(
      "SELECT product_id, shop_id, name, price, availability_status, updated_at FROM products WHERE shop_id = ? ORDER BY name ASC",
      [shopId]
    );
    return res.json({ products: rows });
  } catch (err) {
    console.error("Get products by shop error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function getMyProducts(req, res) {
  try {
    const owner_id = req.user.user_id;
    const [rows] = await db.query(
      `SELECT p.product_id, p.shop_id, s.name AS shop_name, p.name, p.price, p.availability_status, p.updated_at
       FROM products p
       JOIN shops s ON p.shop_id = s.shop_id
       WHERE s.owner_id = ?
       ORDER BY s.name, p.name ASC`,
      [owner_id]
    );
    return res.json({ products: rows });
  } catch (err) {
    console.error("Get my products error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { price, availability_status } = req.body;
    const owner_id = req.user.user_id;

    const [rows] = await db.query(
      `SELECT p.product_id, s.owner_id
       FROM products p JOIN shops s ON p.shop_id = s.shop_id
       WHERE p.product_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (rows[0].owner_id !== owner_id) {
      return res.status(403).json({ message: "You do not own this product's shop." });
    }

    if (availability_status && !["available", "out_of_stock", "few_left"].includes(availability_status)) {
      return res.status(400).json({ message: "Invalid availability_status." });
    }

    const fields = [];
    const values = [];
    if (price !== undefined) {
      fields.push("price = ?");
      values.push(price);
    }
    if (availability_status !== undefined) {
      fields.push("availability_status = ?");
      values.push(availability_status);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Provide at least one of price or availability_status to update." });
    }

    values.push(id);
    await db.query(`UPDATE products SET ${fields.join(", ")} WHERE product_id = ?`, values);

    return res.json({ message: "Product updated successfully." });
  } catch (err) {
    console.error("Update product error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const owner_id = req.user.user_id;

    const [rows] = await db.query(
      `SELECT p.product_id, s.owner_id
       FROM products p JOIN shops s ON p.shop_id = s.shop_id
       WHERE p.product_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (rows[0].owner_id !== owner_id) {
      return res.status(403).json({ message: "You do not own this product's shop." });
    }

    await db.query("DELETE FROM products WHERE product_id = ?", [id]);
    return res.json({ message: "Product deleted successfully." });
  } catch (err) {
    console.error("Delete product error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function searchProducts(req, res) {
  try {
    const { q, lat, lng, radius } = req.query;

    if (!q || !lat || !lng) {
      return res.status(400).json({ message: "q, lat, and lng query parameters are required." });
    }

    const searchRadius = radius ? parseFloat(radius) : 3;

    const query = `
      SELECT
        p.product_id, p.name AS product_name, p.price, p.availability_status,
        s.shop_id, s.name AS shop_name, s.address, s.current_status,
        s.latitude, s.longitude,
        ( 6371 * acos(
            cos(radians(?)) * cos(radians(s.latitude)) *
            cos(radians(s.longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(s.latitude))
        ) ) AS distance_km
      FROM products p
      JOIN shops s ON p.shop_id = s.shop_id
      WHERE p.name LIKE ?
      HAVING distance_km <= ?
      ORDER BY distance_km ASC
    `;

    const [rows] = await db.query(query, [lat, lng, lat, `%${q}%`, searchRadius]);
    return res.json({ results: rows });
  } catch (err) {
    console.error("Search products error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = {
  createProduct,
  getProductsByShop,
  getMyProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
};
