const { Readable } = require("stream");
const csv = require("csv-parser");
const db = require("../config/db");

async function listShops(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT s.shop_id, s.name, s.address, s.is_verified, s.current_status, u.name AS owner_name, u.email AS owner_email
       FROM shops s
       JOIN users u ON s.owner_id = u.user_id
       ORDER BY s.is_verified ASC, s.shop_id DESC`
    );
    return res.json({ shops: rows });
  } catch (err) {
    console.error("List shops error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function verifyShop(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await db.query("SELECT shop_id FROM shops WHERE shop_id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Shop not found." });
    }

    await db.query("UPDATE shops SET is_verified = TRUE WHERE shop_id = ?", [id]);
    return res.json({ message: "Shop verified successfully." });
  } catch (err) {
    console.error("Verify shop error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}
async function deleteShop(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT shop_id, name FROM shops WHERE shop_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Shop not found." });
    }

    await db.query(
      "DELETE FROM shops WHERE shop_id = ?",
      [id]
    );

    return res.json({
      message: `"${rows[0].name}" deleted successfully.`,
    });
  } catch (err) {
    console.error("Delete shop error:", err);
    return res.status(500).json({
      message: "Something went wrong while deleting the shop.",
    });
  }
}
async function bulkUploadProducts(req, res) {
  try {
    const { shop_id } = req.body;

    if (!shop_id) {
      return res.status(400).json({ message: "shop_id is required (as a form field)." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "A CSV file is required (form field name: 'file')." });
    }

    const [shopRows] = await db.query("SELECT shop_id FROM shops WHERE shop_id = ?", [shop_id]);
    if (shopRows.length === 0) {
      return res.status(404).json({ message: "Shop not found." });
    }

    const validStatuses = ["available", "out_of_stock", "few_left"];
    const productsToInsert = [];
    const skippedRows = [];

    await new Promise((resolve, reject) => {
      const stream = Readable.from(req.file.buffer);
      stream
        .pipe(csv())
        .on("data", (row) => {
          const name = (row.name || "").trim();
          const price = parseFloat(row.price);
          const rawStatus = (row.availability_status || "available").trim().toLowerCase();
          const status = validStatuses.includes(rawStatus) ? rawStatus : "available";

          if (!name || isNaN(price)) {
            skippedRows.push(row);
            return;
          }
          productsToInsert.push([shop_id, name, price, status]);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (productsToInsert.length === 0) {
      return res.status(400).json({
        message: "No valid rows found in the CSV. Expected columns: name, price, availability_status.",
        skipped_rows: skippedRows,
      });
    }

    await db.query(
      "INSERT INTO products (shop_id, name, price, availability_status) VALUES ?",
      [productsToInsert]
    );

    return res.status(201).json({
      message: `${productsToInsert.length} product(s) uploaded successfully.`,
      skipped_row_count: skippedRows.length,
    });
  } catch (err) {
    console.error("Bulk upload products error:", err);
    return res.status(500).json({ message: "Something went wrong while processing the CSV file." });
  }
}

module.exports = { listShops, verifyShop,deleteShop, bulkUploadProducts };
