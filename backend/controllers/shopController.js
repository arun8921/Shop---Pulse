const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const { UPLOAD_DIR } = require("../middleware/upload");
const {
  ValidationError,
  ensureOnlyFields,
  hasOwn,
  normalizePhone,
  optionalText,
  parseCoordinate,
  parseOptionalId,
  parsePositiveId,
  parseRadius,
  parseTime,
  requiredText,
  respondWithError,
  timeToSeconds,
} = require("../utils/validation");

const SHOP_WRITE_FIELDS = [
  "name",
  "category_id",
  "business_category",
  "business_sub_category",
  "address",
  "latitude",
  "longitude",
  "contact_number",
  "default_open_time",
  "default_close_time",
];



const SHOP_SUMMARY_JOINS = `
  LEFT JOIN categories c ON s.category_id = c.category_id
  LEFT JOIN (
    SELECT shop_id,
      COUNT(*) AS product_count,
      SUM(availability_status = 'available') AS available_product_count,
      SUM(availability_status = 'few_left') AS few_left_product_count,
      SUM(availability_status = 'out_of_stock') AS out_of_stock_product_count
    FROM products
    GROUP BY shop_id
  ) ps ON ps.shop_id = s.shop_id
  LEFT JOIN (
    SELECT shop_id,
      ROUND(AVG(rating), 1) AS average_rating,
      COUNT(*) AS review_count
    FROM reviews
    GROUP BY shop_id
  ) rs ON rs.shop_id = s.shop_id
`;

function summarizeShopFields() {
  return `
    s.shop_id, s.name, s.category_id, c.name AS category_name, s.business_category, s.business_sub_category, s.address,
    s.latitude, s.longitude, s.contact_number,
    s.default_open_time, s.default_close_time,
    s.current_status, s.is_manually_overridden, s.is_verified,
    s.verification_status, s.verification_reason, s.verified_at,
    s.document_url,
    s.last_updated, s.created_at,
    COALESCE(ps.product_count, 0) AS product_count,
    COALESCE(ps.available_product_count, 0) AS available_product_count,
    COALESCE(ps.few_left_product_count, 0) AS few_left_product_count,
    COALESCE(ps.out_of_stock_product_count, 0) AS out_of_stock_product_count,
    COALESCE(rs.average_rating, 0) AS average_rating,
    COALESCE(rs.review_count, 0) AS review_count
  `;
}

async function ensureCategoryExists(categoryId) {
  if (categoryId === null) return;
  const [rows] = await db.query("SELECT category_id FROM categories WHERE category_id = ?", [categoryId]);
  if (rows.length === 0) {
    throw new ValidationError("Category not found.", 404);
  }
}

async function getOwnedShop(shopId, ownerId) {
  const [rows] = await db.query(
    `SELECT shop_id, owner_id, default_open_time, default_close_time,
            verification_status, document_url
     FROM shops
     WHERE shop_id = ?`,
    [shopId]
  );
  if (rows.length === 0) {
    throw new ValidationError("Shop not found.", 404);
  }
  if (rows[0].owner_id !== ownerId) {
    throw new ValidationError("You do not own this shop.", 403);
  }
  return rows[0];
}

/**
 * Like getOwnedShop but also requires the shop to be approved.
 * Used to gate management operations behind admin verification.
 */
async function getOwnedVerifiedShop(shopId, ownerId) {
  const shop = await getOwnedShop(shopId, ownerId);
  if (shop.verification_status !== "approved") {
    throw new ValidationError(
      "This shop has not been verified yet. Please wait for admin approval.",
      403
    );
  }
  return shop;
}

function validateHours(openTime, closeTime) {
  if (timeToSeconds(openTime) >= timeToSeconds(closeTime)) {
    throw new ValidationError("Closing time must be later than opening time.");
  }
}
/**
 * Returns the current date string in IST (YYYY-MM-DD).
 */
function getTodayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Returns the current time in IST as total seconds since midnight.
 */
function getCurrentISTSeconds() {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour").value);
  const minute = Number(parts.find((part) => part.type === "minute").value);
  const second = Number(parts.find((part) => part.type === "second").value);

  return hour * 3600 + minute * 60 + second;
}

function getAutomaticShopStatus(openTime, closeTime) {
    const currentSeconds = getCurrentISTSeconds();
    const openSeconds = timeToSeconds(openTime);
    const closeSeconds = timeToSeconds(closeTime);

    return currentSeconds >= openSeconds && currentSeconds < closeSeconds
        ? "open"
        : "closed";
}

/**
 * Determines whether a manual override should be cleared based on the
 * override type and the shop's schedule.
 *
 * Manual CLOSE:  persists until the NEXT scheduled opening time is reached.
 *                This means it survives the 30-second sync and even crosses
 *                midnight.  It is cleared when:
 *                  - the override was set on a PREVIOUS day (in IST) AND
 *                    the current IST time is >= the shop's opening time.
 *
 * Manual OPEN:   expires at the end of the current day (existing behaviour),
 *                i.e. when the override date (IST) no longer matches today.
 */
function shouldClearManualOverride(shop) {
  const todayIST = getTodayIST();

  // manual_override_date is stored as a MySQL DATE; normalise to YYYY-MM-DD.
  const overrideDate = shop.manual_override_date
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(new Date(shop.manual_override_date))
    : null;

  if (shop.current_status === "closed") {
    // Manual CLOSE — only clear when a new day has started AND we have
    // reached (or passed) the scheduled opening time.
    if (!overrideDate || overrideDate >= todayIST) {
      // Same day or future — keep the manual close.
      return false;
    }
    // Override is from a previous day.  Check if opening time has arrived.
    const currentSeconds = getCurrentISTSeconds();
    const openSeconds = timeToSeconds(shop.default_open_time);
    return currentSeconds >= openSeconds;
  }

  // Manual OPEN — clear when the day rolls over (existing behaviour).
  if (overrideDate !== todayIST) {
    return true;
  }
  return false;
}

async function syncAutomaticShopStatuses() {
  try {
    // 1. Update all shops that are NOT manually overridden.
    const [autoShops] = await db.query(
      `SELECT shop_id, default_open_time, default_close_time
       FROM shops
       WHERE is_manually_overridden = FALSE`
    );

    for (const shop of autoShops) {
      const automaticStatus = getAutomaticShopStatus(
        shop.default_open_time,
        shop.default_close_time
      );

      await db.query(
        `UPDATE shops
         SET current_status = ?
         WHERE shop_id = ?`,
        [automaticStatus, shop.shop_id]
      );
    }

    // 2. Check manually overridden shops to see if the override should expire.
    const [manualShops] = await db.query(
      `SELECT shop_id, default_open_time, default_close_time,
              current_status, manual_override_date
       FROM shops
       WHERE is_manually_overridden = TRUE`
    );

    for (const shop of manualShops) {
      if (shouldClearManualOverride(shop)) {
        const automaticStatus = getAutomaticShopStatus(
          shop.default_open_time,
          shop.default_close_time
        );
        await db.query(
          `UPDATE shops
           SET current_status = ?,
               is_manually_overridden = FALSE,
               manual_override_date = NULL
           WHERE shop_id = ?`,
          [automaticStatus, shop.shop_id]
        );
      }
    }
  } catch (err) {
    console.error("Automatic shop status sync error:", err);
  }
}
async function createShop(req, res) {
  try {
    ensureOnlyFields(req.body, SHOP_WRITE_FIELDS);

    if (!req.file) {
      return res.status(400).json({
        message: "A verification document (license / registration proof) is required.",
      });
    }

    const name = requiredText(req.body.name, "Shop name", { min: 2, max: 150 });
    const categoryId = parseOptionalId(req.body.category_id, "Category ID");
    const address = optionalText(req.body.address, "Address", { max: 255 });
    const latitude = parseCoordinate(req.body.latitude, "Latitude", -90, 90);
    const longitude = parseCoordinate(req.body.longitude, "Longitude", -180, 180);
    const contactNumber = normalizePhone(req.body.contact_number);
    const openTime = hasOwn(req.body, "default_open_time")
      ? parseTime(req.body.default_open_time, "Opening time")
      : "09:00:00";
    const closeTime = hasOwn(req.body, "default_close_time")
      ? parseTime(req.body.default_close_time, "Closing time")
      : "20:00:00";

    const businessCategory = optionalText(req.body.business_category, "Business Category", { max: 100 });
    const businessSubCategory = optionalText(req.body.business_sub_category, "Business Sub Category", { max: 100 });

    validateHours(openTime, closeTime);
    await ensureCategoryExists(categoryId);

    const [result] = await db.query(
      `INSERT INTO shops (
        owner_id, name, category_id, business_category, business_sub_category, address, latitude, longitude, contact_number,
        default_open_time, default_close_time,
        is_verified, verification_status, document_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 'pending', ?)`,
      [
        req.user.user_id,
        name,
        categoryId,
        businessCategory,
        businessSubCategory,
        address,
        latitude,
        longitude,
        contactNumber,
        openTime,
        closeTime,
        req.file.filename,
      ]
    );

    return res.status(201).json({
      message: "Shop registered successfully. It will be visible to customers after admin verification.",
      shop_id: result.insertId,
    });
  } catch (err) {
    // Clean up uploaded file on failure
    if (req.file) {
      fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
    }
    return respondWithError(res, err, "Something went wrong while registering the shop.", "Create shop error:");
  }
}

async function getMyShops(req, res) {
  try {
    const [shops] = await db.query(
      `SELECT shop_id, default_open_time, default_close_time,
              current_status, is_manually_overridden, manual_override_date
       FROM shops
       WHERE owner_id = ?
       ORDER BY created_at DESC, shop_id DESC`,
      [req.user.user_id]
    );

    // Synchronize statuses before returning to the owner.
    for (const shop of shops) {
      if (shop.is_manually_overridden) {
        // Check if the manual override should expire.
        if (!shouldClearManualOverride(shop)) {
          continue; // Override still active — leave status as-is.
        }
      }

      const automaticStatus = getAutomaticShopStatus(
        shop.default_open_time,
        shop.default_close_time
      );

      if (
        shop.current_status !== automaticStatus ||
        shop.is_manually_overridden
      ) {
        await db.query(
          `UPDATE shops
           SET current_status = ?,
               is_manually_overridden = FALSE,
               manual_override_date = NULL
           WHERE shop_id = ?`,
          [automaticStatus, shop.shop_id]
        );

        shop.current_status = automaticStatus;
        shop.is_manually_overridden = false;
        shop.manual_override_date = null;
      }
    }

    // Now fetch the complete shop information
    const [rows] = await db.query(
      `SELECT ${summarizeShopFields()}
       FROM shops s
       ${SHOP_SUMMARY_JOINS}
       WHERE s.owner_id = ?
       ORDER BY s.created_at DESC, s.shop_id DESC`,
      [req.user.user_id]
    );

    return res.json({ shops: rows });

  } catch (err) {
    return respondWithError(
      res,
      err,
      "Something went wrong.",
      "Get my shops error:"
    );
  }
}

async function updateShopDetails(req, res) {
  try {
    ensureOnlyFields(req.body, SHOP_WRITE_FIELDS);
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "Provide at least one shop field to update." });
    }

    const shopId = parsePositiveId(req.params.id, "Shop ID");
    const currentShop = await getOwnedVerifiedShop(shopId, req.user.user_id);
    const fields = [];
    const values = [];

    if (hasOwn(req.body, "name")) {
      fields.push("name = ?");
      values.push(requiredText(req.body.name, "Shop name", { min: 2, max: 150 }));
    }
    if (hasOwn(req.body, "category_id")) {
      const categoryId = parseOptionalId(req.body.category_id, "Category ID");
      await ensureCategoryExists(categoryId);
      fields.push("category_id = ?");
      values.push(categoryId);
    }
    
    let requiresReverification = false;

    if (hasOwn(req.body, "business_category")) {
      fields.push("business_category = ?");
      values.push(optionalText(req.body.business_category, "Business Category", { max: 100 }));
      requiresReverification = true;
    }
    if (hasOwn(req.body, "business_sub_category")) {
      fields.push("business_sub_category = ?");
      values.push(optionalText(req.body.business_sub_category, "Business Sub Category", { max: 100 }));
      requiresReverification = true;
    }
    if (hasOwn(req.body, "address")) {
      fields.push("address = ?");
      values.push(optionalText(req.body.address, "Address", { max: 255 }));
    }
    if (hasOwn(req.body, "latitude")) {
      fields.push("latitude = ?");
      values.push(parseCoordinate(req.body.latitude, "Latitude", -90, 90));
    }
    if (hasOwn(req.body, "longitude")) {
      fields.push("longitude = ?");
      values.push(parseCoordinate(req.body.longitude, "Longitude", -180, 180));
    }
    if (hasOwn(req.body, "contact_number")) {
      fields.push("contact_number = ?");
      values.push(normalizePhone(req.body.contact_number));
    }

    const openTime = hasOwn(req.body, "default_open_time")
      ? parseTime(req.body.default_open_time, "Opening time")
      : parseTime(currentShop.default_open_time, "Opening time");
    const closeTime = hasOwn(req.body, "default_close_time")
      ? parseTime(req.body.default_close_time, "Closing time")
      : parseTime(currentShop.default_close_time, "Closing time");
    validateHours(openTime, closeTime);

    if (hasOwn(req.body, "default_open_time")) {
  fields.push("default_open_time = ?");
  values.push(openTime);
}

if (hasOwn(req.body, "default_close_time")) {
  fields.push("default_close_time = ?");
  values.push(closeTime);
}

// Changing the schedule means we should return
// the shop to automatic schedule control.
if (
  hasOwn(req.body, "default_open_time") ||
  hasOwn(req.body, "default_close_time")
) {
  const automaticStatus = getAutomaticShopStatus(
    openTime,
    closeTime
  );

  fields.push("current_status = ?");
  values.push(automaticStatus);

  fields.push("is_manually_overridden = FALSE");
  fields.push("manual_override_date = NULL");
}

if (requiresReverification) {
  fields.push("verification_status = 'pending'");
  fields.push("is_verified = FALSE");
  fields.push("verification_reason = NULL");
  fields.push("verified_at = NULL");
}

    values.push(shopId);
    await db.query(`UPDATE shops SET ${fields.join(", ")} WHERE shop_id = ?`, values);

    const [updatedRows] = await db.query(
      `SELECT ${summarizeShopFields()}
       FROM shops s
       ${SHOP_SUMMARY_JOINS}
       WHERE s.shop_id = ?`,
      [shopId]
    );
    return res.json({ message: "Shop details updated successfully.", shop: updatedRows[0] });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong while updating the shop.", "Update shop details error:");
  }
}

async function updateShopStatus(req, res) {
  try {
    const shopId = parsePositiveId(req.params.id, "Shop ID");
    const { status } = req.body || {};

    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'open' or 'closed'." });
    }

    await getOwnedVerifiedShop(shopId, req.user.user_id);

    const todayIST = getTodayIST();

    await db.query(
      `UPDATE shops
       SET current_status = ?,
           is_manually_overridden = TRUE,
           manual_override_date = ?
       WHERE shop_id = ?`,
      [status, todayIST, shopId]
    );

    const message = status === "closed"
      ? "Shop marked as closed. It will remain closed until you open it or until tomorrow's opening time."
      : "Shop marked as open for today.";

    return res.json({
      message,
    });
  } catch (err) {
    return respondWithError(
      res,
      err,
      "Something went wrong.",
      "Update shop status error:"
    );
  }
}

async function resetShopStatusToAutomatic(req, res) {
  try {
    const shopId = parsePositiveId(req.params.id, "Shop ID");

    const shop = await getOwnedVerifiedShop(shopId, req.user.user_id);

    const automaticStatus = getAutomaticShopStatus(
      shop.default_open_time,
      shop.default_close_time
    );

    await db.query(
      `UPDATE shops
       SET current_status = ?, is_manually_overridden = FALSE
       WHERE shop_id = ?`,
      [automaticStatus, shopId]
    );

    return res.json({
      message: "Shop is now using automatic opening hours.",
      current_status: automaticStatus,
      is_manually_overridden: false,
    });
  } catch (err) {
    return respondWithError(
      res,
      err,
      "Something went wrong.",
      "Reset shop status error:"
    );
  }
}

async function getNearbyShops(req, res) {
  try {
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
    const query = `
     SELECT s.shop_id, s.name, s.address, s.latitude, s.longitude,
  s.current_status,
  s.last_updated, s.is_verified,
        s.business_category, s.business_sub_category,
        COALESCE(rs.average_rating, 0) AS average_rating,
        COALESCE(rs.review_count, 0) AS review_count,
        ${distanceExpression} AS distance_km
      FROM shops s
      LEFT JOIN categories c ON s.category_id = c.category_id
      LEFT JOIN (
        SELECT shop_id, ROUND(AVG(rating), 1) AS average_rating, COUNT(*) AS review_count
        FROM reviews
        GROUP BY shop_id
      ) rs ON rs.shop_id = s.shop_id
      WHERE s.is_verified = TRUE
      HAVING distance_km <= ?
      ORDER BY distance_km ASC, s.name ASC
      LIMIT 100
    `;

    const [rows] = await db.query(query, [latitude, longitude, latitude, searchRadius]);
    return res.json({ shops: rows });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong.", "Get nearby shops error:");
  }
}

async function syncShopSchedule(shopId) {
  const [rows] = await db.query(
    `SELECT default_open_time, default_close_time,
            current_status, is_manually_overridden, manual_override_date
     FROM shops
     WHERE shop_id = ?`,
    [shopId]
  );

  if (rows.length === 0) return null;

  const shop = rows[0];

  // Respect owner's manual override unless it should be cleared.
  if (shop.is_manually_overridden && !shouldClearManualOverride(shop)) {
    return shop.current_status;
  }

  const scheduledStatus = getAutomaticShopStatus(
    shop.default_open_time,
    shop.default_close_time
  );

  if (shop.current_status !== scheduledStatus || shop.is_manually_overridden) {
    await db.query(
      `UPDATE shops
       SET current_status = ?,
           is_manually_overridden = FALSE,
           manual_override_date = NULL
       WHERE shop_id = ?`,
      [scheduledStatus, shopId]
    );
  }

  return scheduledStatus;
}

async function getShopStatuses(req, res) {
  try {
    const { ids } = req.query;
    if (typeof ids !== "string" || !ids.trim()) {
      return res.status(400).json({ message: "ids query parameter is required (comma-separated)." });
    }

    const rawIds = ids.split(",").map((id) => id.trim()).filter(Boolean);
    if (rawIds.length > 100) {
      return res.status(400).json({ message: "Provide no more than 100 shop IDs at a time." });
    }
    const idList = [...new Set(rawIds.map((id) => parsePositiveId(id, "Shop ID")))];
    const placeholders = idList.map(() => "?").join(",");
    const [rows] = await db.query(
      `SELECT shop_id, current_status, last_updated
       FROM shops
       WHERE is_verified = TRUE AND shop_id IN (${placeholders})`,
      idList
    );
    return res.json({ shops: rows });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong.", "Get shop statuses error:");
  }
}

async function getCategories(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT c.category_id, c.name, COUNT(s.shop_id) AS verified_shop_count
       FROM categories c
       LEFT JOIN shops s ON s.category_id = c.category_id AND s.is_verified = TRUE
       GROUP BY c.category_id, c.name
       ORDER BY c.name ASC`
    );
    return res.json({ categories: rows });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong.", "Get categories error:");
  }
}

async function getShopById(req, res) {
  try {
    const shopId = parsePositiveId(req.params.id, "Shop ID");
    const [rows] = await db.query(
      `SELECT ${summarizeShopFields()}
       FROM shops s
       ${SHOP_SUMMARY_JOINS}
       WHERE s.shop_id = ? AND s.is_verified = TRUE`,
      [shopId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Shop not found or not yet verified." });
    }
    return res.json({ shop: rows[0] });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong.", "Get shop details error:");
  }
}

async function getOwnerSummary(req, res) {
  try {
    const ownerId = req.user.user_id;
    const [rows] = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM shops WHERE owner_id = ?) AS shop_count,
        (SELECT COUNT(*) FROM shops WHERE owner_id = ? AND is_verified = TRUE) AS verified_shop_count,
        (SELECT COUNT(*) FROM shops WHERE owner_id = ? AND current_status = 'open') AS open_shop_count,
        (SELECT COUNT(*)
         FROM products p JOIN shops s ON p.shop_id = s.shop_id
         WHERE s.owner_id = ?) AS product_count,
        (SELECT COUNT(*)
         FROM products p JOIN shops s ON p.shop_id = s.shop_id
         WHERE s.owner_id = ? AND p.availability_status IN ('few_left', 'out_of_stock')) AS attention_product_count,
        (SELECT COUNT(*)
         FROM orders o JOIN shops s ON o.shop_id = s.shop_id
         WHERE s.owner_id = ? AND o.status IN ('placed', 'confirmed', 'out_for_delivery')) AS active_order_count`,
      [ownerId, ownerId, ownerId, ownerId, ownerId, ownerId]
    );
    return res.json({ summary: rows[0] });
  } catch (err) {
    return respondWithError(res, err, "Something went wrong.", "Get owner summary error:");
  }
}

/**
 * Owner re-submits a verification document after rejection.
 * Resets the shop back to pending so the admin queue picks it up again.
 */
async function resubmitVerification(req, res) {
  try {
    const shopId = parsePositiveId(req.params.id, "Shop ID");
    const shop = await getOwnedShop(shopId, req.user.user_id);

    if (shop.verification_status !== "rejected") {
      return res.status(400).json({
        message: "Only rejected shops can resubmit verification documents.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "A new verification document is required.",
      });
    }

    // Remove old document from disk if it exists.
    if (shop.document_url) {
      const oldPath = path.join(UPLOAD_DIR, shop.document_url);
      fs.unlink(oldPath, () => {});
    }

    await db.query(
      `UPDATE shops
       SET document_url = ?,
           verification_status = 'pending',
           verification_reason = NULL,
           is_verified = FALSE,
           verified_at = NULL
       WHERE shop_id = ?`,
      [req.file.filename, shopId]
    );

    return res.json({
      message: "Document resubmitted. Your shop is back in the verification queue.",
    });
  } catch (err) {
    if (req.file) {
      fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
    }
    return respondWithError(
      res, err, "Something went wrong.", "Resubmit verification error:"
    );
  }
}

/**
 * Serves the verification document for a shop.
 * Accessible by the shop owner or any admin.
 */
async function getShopDocument(req, res) {
  try {
    const shopId = parsePositiveId(req.params.id, "Shop ID");

    const [rows] = await db.query(
      "SELECT owner_id, document_url FROM shops WHERE shop_id = ?",
      [shopId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Shop not found." });
    }

    const shop = rows[0];
    const isOwner = shop.owner_id === req.user.user_id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You do not have access to this document." });
    }

    if (!shop.document_url) {
      return res.status(404).json({ message: "No document has been uploaded for this shop." });
    }

    const filePath = path.join(UPLOAD_DIR, shop.document_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Document file not found on server." });
    }

    return res.sendFile(filePath);
  } catch (err) {
    return respondWithError(
      res, err, "Something went wrong.", "Get shop document error:"
    );
  }
}

module.exports = {
  createShop,
  getMyShops,
  updateShopDetails,
  updateShopStatus,
  resetShopStatusToAutomatic,
  syncAutomaticShopStatuses,
  syncShopSchedule,
  getNearbyShops,
  getShopStatuses,
  getCategories,
  getShopById,
  getOwnerSummary,
  resubmitVerification,
  getShopDocument,
};
