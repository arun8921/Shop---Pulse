const db = require("../config/db");
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
    s.shop_id, s.name, s.category_id, c.name AS category_name, s.address,
    s.latitude, s.longitude, s.contact_number,
    s.default_open_time, s.default_close_time,
    s.current_status, s.is_manually_overridden, s.is_verified,
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
    `SELECT shop_id, owner_id, default_open_time, default_close_time
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

function validateHours(openTime, closeTime) {
  if (timeToSeconds(openTime) >= timeToSeconds(closeTime)) {
    throw new ValidationError("Closing time must be later than opening time.");
  }
}
function getAutomaticShopStatus(openTime, closeTime) {
    const now = new Date();

    // Always calculate shop time using IST
    const parts = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(now);

    const hour = Number(parts.find((part) => part.type === "hour").value);
    const minute = Number(parts.find((part) => part.type === "minute").value);
    const second = Number(parts.find((part) => part.type === "second").value);

    const currentSeconds =
        hour * 3600 +
        minute * 60 +
        second;

    const openSeconds = timeToSeconds(openTime);
    const closeSeconds = timeToSeconds(closeTime);

    return currentSeconds >= openSeconds && currentSeconds < closeSeconds
        ? "open"
        : "closed";
}
async function syncAutomaticShopStatuses() {
  try {
    const [shops] = await db.query(
      `SELECT shop_id, default_open_time, default_close_time
       FROM shops
       WHERE is_manually_overridden = FALSE`
    );

    for (const shop of shops) {
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
  } catch (err) {
    console.error("Automatic shop status sync error:", err);
  }
}
async function createShop(req, res) {
  try {
    ensureOnlyFields(req.body, SHOP_WRITE_FIELDS);
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

    validateHours(openTime, closeTime);
    await ensureCategoryExists(categoryId);

    const [result] = await db.query(
      `INSERT INTO shops (
        owner_id, name, category_id, address, latitude, longitude, contact_number,
        default_open_time, default_close_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        name,
        categoryId,
        address,
        latitude,
        longitude,
        contactNumber,
        openTime,
        closeTime,
      ]
    );

    return res.status(201).json({
      message: "Shop registered successfully. It will be visible to customers after verification.",
      shop_id: result.insertId,
    });
  } catch (err) {
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

    // Synchronize automatic statuses
    for (const shop of shops) {
      // If owner manually changed today's status,
      // respect that decision.
      const todayIST = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const manualOverrideDate = shop.manual_override_date
        ? new Date(shop.manual_override_date)
            .toISOString()
            .slice(0, 10)
        : null;

      if (
        shop.is_manually_overridden &&
        manualOverrideDate === todayIST
      ) {
        continue;
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
    const currentShop = await getOwnedShop(shopId, req.user.user_id);
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

    await getOwnedShop(shopId, req.user.user_id);

    await db.query(
      `UPDATE shops
       SET current_status = ?,
           is_manually_overridden = TRUE,
           manual_override_date = CURDATE()
       WHERE shop_id = ?`,
      [status, shopId]
    );

    return res.json({
      message: `Shop marked as ${status} for today.`,
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

    const shop = await getOwnedShop(shopId, req.user.user_id);

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
        c.name AS category_name,
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

  // Respect owner's manual decision for today.
  if (
    shop.is_manually_overridden &&
    shop.manual_override_date &&
    String(shop.manual_override_date).slice(0, 10) ===
      new Date().toISOString().slice(0, 10)
  ) {
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
};
