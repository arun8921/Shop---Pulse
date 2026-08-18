const { Readable } = require("stream");
const csv = require("csv-parser");
const db = require("../config/db");

async function listShops(req, res) {
  try {
    const [rows] = await db.query(
  `SELECT
      s.shop_id,
      s.name,
      s.address,
      s.contact_number,
      s.is_verified,
      s.current_status,
      s.verification_status,
      s.verification_reason,
      s.verified_at,
      s.document_url,
      s.created_at,
      s.business_category,
      s.business_sub_category,
      u.name AS owner_name,
      u.email AS owner_email,
      c.name AS category_name
   FROM shops s
   JOIN users u ON s.owner_id = u.user_id
   LEFT JOIN categories c ON s.category_id = c.category_id
   ORDER BY
      CASE
        WHEN s.verification_status = 'pending' THEN 1
        WHEN s.verification_status = 'rejected' THEN 2
        WHEN s.verification_status = 'approved' THEN 3
      END,
      s.shop_id DESC`
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

    const [rows] = await db.query(
      `SELECT shop_id, verification_status
       FROM shops
       WHERE shop_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Shop not found." });
    }

    if (rows[0].verification_status === "approved") {
      return res.status(400).json({
        message: "This shop is already approved.",
      });
    }

    await db.query(
      `UPDATE shops
       SET is_verified = TRUE,
           verification_status = 'approved',
           verification_reason = NULL,
           verified_at = NOW()
       WHERE shop_id = ?`,
      [id]
    );

    return res.json({
      message: "Shop approved successfully.",
    });
  } catch (err) {
    console.error("Verify shop error:", err);
    return res.status(500).json({
      message: "Something went wrong.",
    });
  }
}
async function rejectShop(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        message: "Rejection reason is required.",
      });
    }

    const [rows] = await db.query(
      "SELECT shop_id, verification_status FROM shops WHERE shop_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Shop not found.",
      });
    }

    if (rows[0].verification_status === "rejected") {
      return res.status(400).json({
        message: "This shop is already rejected.",
      });
    }

    await db.query(
      `UPDATE shops
       SET is_verified = FALSE,
           verification_status = 'rejected',
           verification_reason = ?,
           verified_at = NULL
       WHERE shop_id = ?`,
      [reason.trim(), id]
    );

    return res.json({
      message: "Shop rejected successfully.",
    });
  } catch (err) {
    console.error("Reject shop error:", err);

    return res.status(500).json({
      message: "Something went wrong.",
    });
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
async function listUsers(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT user_id, name, email, phone, role, created_at
       FROM users
       ORDER BY role ASC, created_at DESC`
    );

    return res.json({ users: rows });
  } catch (err) {
    console.error("List users error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = {
  listShops,
  verifyShop,
  rejectShop,
  deleteShop,
  listUsers

};
