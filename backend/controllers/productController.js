const db = require("../config/db");
const {
  ValidationError,
  ensureOnlyFields,
  hasOwn,
  parsePositiveId,
  parsePositivePrice,
  parseCoordinate,
  parseRadius,
  requiredText,
  respondWithError,
} = require("../utils/validation");

const PRODUCT_STATUSES = ["available", "out_of_stock", "few_left"];
const PRODUCT_WRITE_FIELDS = ["shop_id", "name", "price", "availability_status"];
const PRODUCT_UPDATE_FIELDS = ["name", "price", "availability_status"];

function parseAvailabilityStatus(value) {
  if (typeof value !== "string" || !PRODUCT_STATUSES.includes(value)) {
    throw new ValidationError("availability_status must be available, few_left, or out_of_stock.");
  }
  return value;
}

async function ownerOwnsShop(shopId, ownerId) {
  const [rows] = await db.query("SELECT owner_id FROM shops WHERE shop_id = ?", [shopId]);
  if (rows.length === 0) return { exists: false, owns: false };
  return { exists: true, owns: rows[0].owner_id === ownerId };
}

async function createProduct(req, res) {
  try {
    ensureOnlyFields(req.body, PRODUCT_WRITE_FIELDS);
    const shopId = parsePositiveId(req.body.shop_id, "Shop ID");
    const name = requiredText(req.body.name, "Product name", { min: 1, max: 150 });
    const price = parsePositivePrice(req.body.price);
    const status = req.body.availability_status === undefined
      ? "available"
      : parseAvailabilityStatus(req.body.availability_status);

    const { exists, owns } = await ownerOwnsShop(shopId, req.user.user_id);
    if (!exists) {
      return res.status(404).json({ message: "Shop not found." });
    }
    if (!owns) {
      return res.status(403).json({ message: "You do not own this shop." });
    }

    const [result] = await db.query(
      "INSERT INTO products (shop_id, name, price, availability_status) VALUES (?, ?, ?, ?)",
      [shopId, name, price, status]
    );

    return res.status(201).json({ message: "Product added successfully.", product_id: result.insertId });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong while adding the product.", "Create product error:");
  }
}

async function getProductsByShop(req, res) {
  try {
    const shopId = parsePositiveId(req.params.shopId, "Shop ID");
    const [shopRows] = await db.query(
      "SELECT shop_id FROM shops WHERE shop_id = ? AND is_verified = TRUE",
      [shopId]
    );
    if (shopRows.length === 0) {
      return res.status(404).json({ message: "Shop not found or not yet verified." });
    }

    const [rows] = await db.query(
      `SELECT product_id, shop_id, name, price, availability_status, updated_at
       FROM products
       WHERE shop_id = ?
       ORDER BY name ASC, product_id ASC`,
      [shopId]
    );
    return res.json({ products: rows });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong.", "Get products by shop error:");
  }
}

async function getMyProducts(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.product_id, p.shop_id, s.name AS shop_name, s.is_verified, s.current_status,
              p.name, p.price, p.availability_status, p.updated_at
       FROM products p
       JOIN shops s ON p.shop_id = s.shop_id
       WHERE s.owner_id = ?
       ORDER BY s.name ASC, p.name ASC, p.product_id ASC`,
      [req.user.user_id]
    );
    return res.json({ products: rows });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong.", "Get my products error:");
  }
}

async function updateProduct(req, res) {
  try {
    ensureOnlyFields(req.body, PRODUCT_UPDATE_FIELDS);
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "Provide at least one product field to update." });
    }

    const productId = parsePositiveId(req.params.id, "Product ID");
    const [rows] = await db.query(
      `SELECT p.product_id, s.owner_id
       FROM products p
       JOIN shops s ON p.shop_id = s.shop_id
       WHERE p.product_id = ?`,
      [productId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (rows[0].owner_id !== req.user.user_id) {
      return res.status(403).json({ message: "You do not own this product's shop." });
    }

    const fields = [];
    const values = [];
    if (hasOwn(req.body, "name")) {
      fields.push("name = ?");
      values.push(requiredText(req.body.name, "Product name", { min: 1, max: 150 }));
    }
    if (hasOwn(req.body, "price")) {
      fields.push("price = ?");
      values.push(parsePositivePrice(req.body.price));
    }
    if (hasOwn(req.body, "availability_status")) {
      fields.push("availability_status = ?");
      values.push(parseAvailabilityStatus(req.body.availability_status));
    }

    values.push(productId);
    await db.query(`UPDATE products SET ${fields.join(", ")} WHERE product_id = ?`, values);
    return res.json({ message: "Product updated successfully." });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong.", "Update product error:");
  }
}

async function deleteProduct(req, res) {
  let connection;
  let transactionStarted = false;
  try {
    const productId = parsePositiveId(req.params.id, "Product ID");
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [productRows] = await connection.query(
      `SELECT p.product_id, s.owner_id
       FROM products p
       JOIN shops s ON p.shop_id = s.shop_id
       WHERE p.product_id = ?
       FOR UPDATE`,
      [productId]
    );
    if (productRows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: "Product not found." });
    }
    if (productRows[0].owner_id !== req.user.user_id) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(403).json({ message: "You do not own this product's shop." });
    }

    const [orderRows] = await connection.query(
      "SELECT order_id FROM orders WHERE product_id = ? LIMIT 1 FOR UPDATE",
      [productId]
    );
    if (orderRows.length > 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        message: "This product cannot be deleted because it is referenced by one or more orders. Mark it out of stock instead.",
      });
    }

    await connection.query("DELETE FROM products WHERE product_id = ?", [productId]);
    await connection.commit();
    transactionStarted = false;
    return res.json({ message: "Product deleted successfully." });
  } catch (err) {
    if (transactionStarted && connection) {
      await connection.rollback();
    }
    return respondWithError(res, err, "Something went wrong.", "Delete product error:");
  } finally {
    if (connection) connection.release();
  }
}

async function searchProducts(req, res) {
  try {
    const queryText = requiredText(req.query.q, "q", { min: 1, max: 100 });
    const latitude = parseCoordinate(req.query.lat, "lat", -90, 90);
    const longitude = parseCoordinate(req.query.lng, "lng", -180, 180);
    const searchRadius = parseRadius(req.query.radius);

    const distanceExpression = `(6371 * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(?)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(s.latitude))
      ))
    ))`;
    const [rows] = await db.query(
      `SELECT
        p.product_id, p.name AS product_name, p.price, p.availability_status,
        s.shop_id, s.name AS shop_name, s.address, s.current_status,
        s.latitude, s.longitude, c.name AS category_name,
        ${distanceExpression} AS distance_km
      FROM products p
      JOIN shops s ON p.shop_id = s.shop_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE s.is_verified = TRUE AND p.name LIKE ?
      HAVING distance_km <= ?
      ORDER BY distance_km ASC, p.name ASC
      LIMIT 100`,
      [latitude, longitude, latitude, `%${queryText}%`, searchRadius]
    );
    return res.json({ results: rows });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong.", "Search products error:");
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
