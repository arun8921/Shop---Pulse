const { Readable } = require("stream");
const csv = require("csv-parser");
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
  optionalText,
  respondWithError,
} = require("../utils/validation");

const PRODUCT_STATUSES = ["available", "out_of_stock", "few_left"];
const PRODUCT_WRITE_FIELDS = [
  "shop_id", "name", "description", "brand", "sku", "unit",
  "price", "mrp", "availability_status",
];
const PRODUCT_UPDATE_FIELDS = [
  "name", "description", "brand", "sku", "unit",
  "price", "mrp", "availability_status",
];

function parseAvailabilityStatus(value) {
  if (typeof value !== "string" || !PRODUCT_STATUSES.includes(value)) {
    throw new ValidationError("availability_status must be available, few_left, or out_of_stock.");
  }
  return value;
}

/**
 * Parse an optional MRP value.  Returns null when the field is empty/absent,
 * otherwise validates it as a positive price.
 */
function parseOptionalPrice(value, label = "MRP") {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 99999999.99) {
    throw new ValidationError(`${label} must be a positive amount no greater than 99,999,999.99.`);
  }
  if (Math.abs(Math.round(parsed * 100) - parsed * 100) > 1e-8) {
    throw new ValidationError(`${label} can have no more than two decimal places.`);
  }
  return parsed;
}

async function ownerOwnsShop(shopId, ownerId) {
  const [rows] = await db.query(
    "SELECT owner_id, verification_status FROM shops WHERE shop_id = ?",
    [shopId]
  );
  if (rows.length === 0) return { exists: false, owns: false, verified: false };
  return {
    exists: true,
    owns: rows[0].owner_id === ownerId,
    verified: rows[0].verification_status === "approved",
  };
}

async function createProduct(req, res) {
  try {
    ensureOnlyFields(req.body, PRODUCT_WRITE_FIELDS);
    const shopId = parsePositiveId(req.body.shop_id, "Shop ID");
    const name = requiredText(req.body.name, "Product name", { min: 1, max: 150 });
    const description = optionalText(req.body.description, "Description", { max: 500 });
    const brand = optionalText(req.body.brand, "Brand", { max: 100 });
    const sku = optionalText(req.body.sku, "SKU", { max: 50 });
    const unit = optionalText(req.body.unit, "Unit", { max: 30 });
    const price = parsePositivePrice(req.body.price);
    const mrp = parseOptionalPrice(req.body.mrp, "MRP");
    const status = req.body.availability_status === undefined
      ? "available"
      : parseAvailabilityStatus(req.body.availability_status);

    const { exists, owns, verified } = await ownerOwnsShop(shopId, req.user.user_id);
    if (!exists) {
      return res.status(404).json({ message: "Shop not found." });
    }
    if (!owns) {
      return res.status(403).json({ message: "You do not own this shop." });
    }
    if (!verified) {
      return res.status(403).json({
        message: "This shop has not been verified yet. Please wait for admin approval before adding products.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO products (shop_id, name, description, brand, sku, unit, price, mrp, availability_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [shopId, name, description, brand, sku, unit, price, mrp, status]
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
  `SELECT shop_id, name, address, current_status, default_open_time
   FROM shops
   WHERE shop_id = ? AND is_verified = TRUE`,
  [shopId]
);

    if (shopRows.length === 0) {
      return res.status(404).json({
        message: "Shop not found or not yet verified.",
      });
    }

    const [rows] = await db.query(
  `SELECT 
      p.product_id,
      p.shop_id,
      p.name,
      p.description,
      p.brand,
      p.sku,
      p.unit,
      p.price,
      p.mrp,
      p.availability_status,
      p.updated_at
   FROM products p
   WHERE p.shop_id = ?
   ORDER BY p.name ASC, p.product_id ASC`,
  [shopId]
);

    return res.json({
      shop: {
        shop_id: shopRows[0].shop_id,
        current_status: shopRows[0].current_status,
        default_open_time: shopRows[0].default_open_time,
      },
      products: rows,
    });
  } catch (err) {
    return respondWithError(
      res,
      err,
      "Something went wrong.",
      "Get products by shop error:"
    );
  }
}

async function getMyProducts(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.product_id, p.shop_id, s.name AS shop_name, s.is_verified, s.current_status,
              p.name, p.description, p.brand, p.sku, p.unit,
              p.price, p.mrp, p.availability_status, p.updated_at
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
      `SELECT p.product_id, s.owner_id, s.verification_status
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
    if (rows[0].verification_status !== "approved") {
      return res.status(403).json({
        message: "This shop has not been verified yet. Please wait for admin approval before modifying products.",
      });
    }

    const fields = [];
    const values = [];
    if (hasOwn(req.body, "name")) {
      fields.push("name = ?");
      values.push(requiredText(req.body.name, "Product name", { min: 1, max: 150 }));
    }
    if (hasOwn(req.body, "description")) {
      fields.push("description = ?");
      values.push(optionalText(req.body.description, "Description", { max: 500 }));
    }
    if (hasOwn(req.body, "brand")) {
      fields.push("brand = ?");
      values.push(optionalText(req.body.brand, "Brand", { max: 100 }));
    }
    if (hasOwn(req.body, "sku")) {
      fields.push("sku = ?");
      values.push(optionalText(req.body.sku, "SKU", { max: 50 }));
    }
    if (hasOwn(req.body, "unit")) {
      fields.push("unit = ?");
      values.push(optionalText(req.body.unit, "Unit", { max: 30 }));
    }
    if (hasOwn(req.body, "price")) {
      fields.push("price = ?");
      values.push(parsePositivePrice(req.body.price));
    }
    if (hasOwn(req.body, "mrp")) {
      fields.push("mrp = ?");
      values.push(parseOptionalPrice(req.body.mrp, "MRP"));
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
      `SELECT p.product_id, s.owner_id, s.verification_status
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
    if (productRows[0].verification_status !== "approved") {
      await connection.rollback();
      transactionStarted = false;
      return res.status(403).json({
        message: "This shop has not been verified yet. Please wait for admin approval before deleting products.",
      });
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
        p.product_id, p.name AS product_name, p.description, p.brand, p.unit,
        p.price, p.mrp, p.availability_status,
        s.shop_id, s.name AS shop_name, s.address, s.current_status,
        s.latitude, s.longitude, s.business_category,
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

// ---------------------------------------------------------------------------
//  CSV Bulk Upload (owner-facing)
// ---------------------------------------------------------------------------

const MAX_CSV_ROWS = 500;
const MAX_CSV_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Sanitize a single CSV cell value.
 * Strips leading formula characters (=, +, -, @, \t, \r) that could be used
 * for spreadsheet formula-injection if the data is later exported to Excel.
 */
function sanitizeCell(value) {
  if (typeof value !== "string") return "";
  let v = value.trim();
  // Strip leading formula-injection characters (recursive — a cell like "=+cmd" should strip both)
  while (v.length > 0 && /^[=+\-@\t\r]/.test(v)) {
    v = v.slice(1).trim();
  }
  return v;
}

/**
 * Parse and validate a single CSV row.
 * Returns { valid: true, product: [...] } or { valid: false, errors: [...] }.
 */
function validateCsvRow(row, rowNumber, existingSkus) {
  const errors = [];

  // --- name (required, 1-150) ---
  const rawName = sanitizeCell(row.name);
  if (!rawName) {
    errors.push({ field: "name", message: "Product name is required." });
  } else if (rawName.length > 150) {
    errors.push({ field: "name", message: "Product name must be at most 150 characters." });
  }

  // --- description (optional, max 500) ---
  const rawDesc = sanitizeCell(row.description);
  if (rawDesc.length > 500) {
    errors.push({ field: "description", message: "Description must be at most 500 characters." });
  }

  // --- brand (optional, max 100) ---
  const rawBrand = sanitizeCell(row.brand);
  if (rawBrand.length > 100) {
    errors.push({ field: "brand", message: "Brand must be at most 100 characters." });
  }

  // --- sku (optional, max 50, unique within batch + existing) ---
  const rawSku = sanitizeCell(row.sku);
  if (rawSku.length > 50) {
    errors.push({ field: "sku", message: "SKU must be at most 50 characters." });
  }
  if (rawSku && existingSkus.has(rawSku.toLowerCase())) {
    errors.push({ field: "sku", message: `Duplicate SKU "${rawSku}".` });
  }

  // --- unit (optional, max 30) ---
  const rawUnit = sanitizeCell(row.unit);
  if (rawUnit.length > 30) {
    errors.push({ field: "unit", message: "Unit must be at most 30 characters." });
  }

  // --- price (required, positive, max 2 decimals) ---
  const rawPrice = sanitizeCell(row.price);
  let price = null;
  if (!rawPrice) {
    errors.push({ field: "price", message: "Price is required." });
  } else {
    price = Number(rawPrice);
    if (!Number.isFinite(price) || price <= 0 || price > 99999999.99) {
      errors.push({ field: "price", message: "Price must be a positive number (max 99,999,999.99)." });
      price = null;
    } else if (Math.abs(Math.round(price * 100) - price * 100) > 1e-8) {
      errors.push({ field: "price", message: "Price can have at most two decimal places." });
      price = null;
    }
  }

  // --- mrp (optional, positive) ---
  const rawMrp = sanitizeCell(row.mrp);
  let mrp = null;
  if (rawMrp) {
    mrp = Number(rawMrp);
    if (!Number.isFinite(mrp) || mrp <= 0 || mrp > 99999999.99) {
      errors.push({ field: "mrp", message: "MRP must be a positive number (max 99,999,999.99)." });
      mrp = null;
    } else if (Math.abs(Math.round(mrp * 100) - mrp * 100) > 1e-8) {
      errors.push({ field: "mrp", message: "MRP can have at most two decimal places." });
      mrp = null;
    }
  }

  // --- availability_status (optional, defaults to 'available') ---
  const rawStatus = sanitizeCell(row.availability_status).toLowerCase();
  let status = "available";
  if (rawStatus) {
    if (!PRODUCT_STATUSES.includes(rawStatus)) {
      errors.push({
        field: "availability_status",
        message: `Must be one of: ${PRODUCT_STATUSES.join(", ")}.`,
      });
    } else {
      status = rawStatus;
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      row_number: rowNumber,
      product_name: rawName || "(empty)",
      errors,
    };
  }

  return {
    valid: true,
    product: [
      rawName,
      rawDesc || null,
      rawBrand || null,
      rawSku || null,
      rawUnit || null,
      price,
      mrp,
      status,
    ],
    sku: rawSku || null,
  };
}

/**
 * Owner-facing CSV bulk upload endpoint.
 *
 * Accepts multipart/form-data with:
 *   - shop_id (form field)
 *   - file (CSV file, field name "file")
 *
 * The entire import is atomic — either all valid rows are inserted or none are.
 */
async function bulkUploadProducts(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    // --- Authorization ---
    const shopId = parsePositiveId(req.body.shop_id, "Shop ID");
    const { exists, owns, verified } = await ownerOwnsShop(shopId, req.user.user_id);

    if (!exists) {
      return res.status(404).json({ message: "Shop not found." });
    }
    if (!owns) {
      return res.status(403).json({ message: "You do not own this shop." });
    }
    if (!verified) {
      return res.status(403).json({
        message: "This shop has not been verified yet. Please wait for admin approval before importing products.",
      });
    }

    // --- File validation ---
    if (!req.file) {
      return res.status(400).json({ message: "A CSV file is required." });
    }
    if (req.file.size > MAX_CSV_FILE_SIZE) {
      return res.status(400).json({ message: "CSV file must not exceed 2 MB." });
    }

    // --- Parse CSV ---
    const rows = [];
    await new Promise((resolve, reject) => {
      const stream = Readable.from(req.file.buffer);
      stream
        .pipe(csv({ mapHeaders: ({ header }) => header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, "_") }))
        .on("data", (row) => {
          if (rows.length < MAX_CSV_ROWS + 1) rows.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({
        message: "The CSV file is empty or has no data rows. Expected headers: name, price, availability_status, etc.",
      });
    }

    if (rows.length > MAX_CSV_ROWS) {
      return res.status(400).json({
        message: `CSV contains more than ${MAX_CSV_ROWS} rows. Please split into smaller files.`,
      });
    }

    // --- Fetch existing SKUs for this shop to detect duplicates ---
    const [existingProducts] = await db.query(
      "SELECT sku FROM products WHERE shop_id = ? AND sku IS NOT NULL",
      [shopId]
    );
    const existingSkuSet = new Set(existingProducts.map((p) => p.sku.toLowerCase()));

    // Also track SKUs within this CSV batch to detect intra-file duplicates
    const batchSkuSet = new Set();

    // --- Validate every row ---
    const validProducts = [];
    const failedRows = [];

    for (let i = 0; i < rows.length; i++) {
      // Combine existing DB skus + already-seen batch skus
      const combinedSkus = new Set([...existingSkuSet, ...batchSkuSet]);
      const result = validateCsvRow(rows[i], i + 2, combinedSkus); // +2 because row 1 is the header

      if (result.valid) {
        validProducts.push([shopId, ...result.product]);
        if (result.sku) {
          batchSkuSet.add(result.sku.toLowerCase());
        }
      } else {
        failedRows.push(result);
      }
    }

    // --- If there are failures, report them without inserting anything ---
    if (failedRows.length > 0) {
      return res.status(400).json({
        message: `${failedRows.length} of ${rows.length} row(s) failed validation. No products were imported.`,
        total_rows: rows.length,
        valid_rows: validProducts.length,
        failed_rows: failedRows.length,
        errors: failedRows,
      });
    }

    // --- Transactional insert ---
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    await connection.query(
      `INSERT INTO products
         (shop_id, name, description, brand, sku, unit, price, mrp, availability_status)
       VALUES ?`,
      [validProducts]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: `${validProducts.length} product(s) imported successfully.`,
      total_rows: rows.length,
      imported: validProducts.length,
      failed_rows: 0,
      errors: [],
    });
  } catch (err) {
    if (transactionStarted && connection) {
      try { await connection.rollback(); } catch (_) { /* ignore */ }
    }
    // Handle duplicate-key errors from the DB (e.g. race condition on SKU)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "A product with a duplicate SKU was detected. Please check your CSV for unique SKU values.",
      });
    }
    return respondWithError(
      res, err, "Something went wrong while processing the CSV.", "Bulk upload products error:"
    );
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Returns the CSV template as a downloadable file.
 */
function downloadCsvTemplate(_req, res) {
  const header = "name,description,brand,sku,unit,price,mrp,availability_status";
  const example = '"Basmati Rice 5kg","Premium aged basmati rice","India Gate","RICE-BAS-5KG","5 kg",450,520,available';

  const content = `${header}\n${example}\n`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="shop_pulse_product_template.csv"');
  return res.send(content);
}

module.exports = {
  createProduct,
  getProductsByShop,
  getMyProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
  bulkUploadProducts,
  downloadCsvTemplate,
};
