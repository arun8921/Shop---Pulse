const db = require("../config/db");

async function submitReview(req, res) {
  try {
    const { shop_id, rating, comment } = req.body;
    const customer_id = req.user.user_id;

    if (!shop_id || rating === undefined) {
      return res.status(400).json({ message: "shop_id and rating are required." });
    }
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
    }

    const [shopRows] = await db.query("SELECT shop_id FROM shops WHERE shop_id = ?", [shop_id]);
    if (shopRows.length === 0) {
      return res.status(404).json({ message: "Shop not found." });
    }

    const [existing] = await db.query(
      "SELECT review_id FROM reviews WHERE shop_id = ? AND customer_id = ?",
      [shop_id, customer_id]
    );

    if (existing.length > 0) {
      await db.query(
        "UPDATE reviews SET rating = ?, comment = ?, created_at = CURRENT_TIMESTAMP WHERE review_id = ?",
        [numericRating, comment || null, existing[0].review_id]
      );
      return res.json({ message: "Review updated successfully." });
    }

    const [result] = await db.query(
      "INSERT INTO reviews (shop_id, customer_id, rating, comment) VALUES (?, ?, ?, ?)",
      [shop_id, customer_id, numericRating, comment || null]
    );

    return res.status(201).json({ message: "Review submitted successfully.", review_id: result.insertId });
  } catch (err) {
    console.error("Submit review error:", err);
    return res.status(500).json({ message: "Something went wrong while submitting the review." });
  }
}

async function getReviewsByShop(req, res) {
  try {
    const { shopId } = req.params;

    const [reviews] = await db.query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at, u.name AS customer_name
       FROM reviews r
       JOIN users u ON r.customer_id = u.user_id
       WHERE r.shop_id = ?
       ORDER BY r.created_at DESC`,
      [shopId]
    );

    const [avgRows] = await db.query(
      "SELECT ROUND(AVG(rating), 1) AS average_rating, COUNT(*) AS review_count FROM reviews WHERE shop_id = ?",
      [shopId]
    );

    return res.json({
      average_rating: avgRows[0].average_rating || 0,
      review_count: avgRows[0].review_count,
      reviews,
    });
  } catch (err) {
    console.error("Get reviews by shop error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function deleteReview(req, res) {
  try {
    const { id } = req.params;
    const customer_id = req.user.user_id;

    const [rows] = await db.query("SELECT customer_id FROM reviews WHERE review_id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Review not found." });
    }
    if (rows[0].customer_id !== customer_id) {
      return res.status(403).json({ message: "You can only delete your own review." });
    }

    await db.query("DELETE FROM reviews WHERE review_id = ?", [id]);
    return res.json({ message: "Review deleted successfully." });
  } catch (err) {
    console.error("Delete review error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = { submitReview, getReviewsByShop, deleteReview };
