const db = require("../config/db");

const ALLOWED_TRANSITIONS = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

async function placeOrder(req, res) {
  try {
    const { shop_id, product_id, quantity, delivery_address } = req.body;
    const customer_id = req.user.user_id;

 if (!shop_id || !product_id || !delivery_address) {
  return res.status(400).json({
    message: "shop_id, product_id, and delivery_address are required."
  });
}

// Check whether the shop is open
const [shopRows] = await db.query(
  "SELECT shop_id, current_status FROM shops WHERE shop_id = ?",
  [shop_id]
);

if (shopRows.length === 0) {
  return res.status(404).json({
    message: "Shop not found."
  });
}

if (shopRows[0].current_status !== "open") {
  return res.status(400).json({
    message: "This shop is currently closed and is not accepting orders."
  });
}

const qty = quantity && Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

    const [productRows] = await db.query(
      "SELECT product_id, shop_id, availability_status FROM products WHERE product_id = ? AND shop_id = ?",
      [product_id, shop_id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ message: "Product not found for this shop." });
    }
    if (productRows[0].availability_status === "out_of_stock") {
      return res.status(400).json({ message: "This product is currently out of stock." });
    }

    const [result] = await db.query(
      `INSERT INTO orders (customer_id, shop_id, product_id, quantity, delivery_address, status)
       VALUES (?, ?, ?, ?, ?, 'placed')`,
      [customer_id, shop_id, product_id, qty, delivery_address]
    );

    return res.status(201).json({ message: "Order placed successfully.", order_id: result.insertId });
  } catch (err) {
    console.error("Place order error:", err);
    return res.status(500).json({ message: "Something went wrong while placing the order." });
  }
}

async function getMyOrders(req, res) {
  try {
    const customer_id = req.user.user_id;
    const [rows] = await db.query(
      `SELECT o.order_id, o.quantity, o.delivery_address, o.status, o.order_time, o.updated_at,
              p.name AS product_name, p.price,
              s.name AS shop_name, s.address AS shop_address
       FROM orders o
       JOIN products p ON o.product_id = p.product_id
       JOIN shops s ON o.shop_id = s.shop_id
       WHERE o.customer_id = ?
       ORDER BY o.order_time DESC`,
      [customer_id]
    );
    return res.json({ orders: rows });
  } catch (err) {
    console.error("Get my orders error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const { user_id, role } = req.user;

    const [rows] = await db.query(
      `SELECT o.order_id, o.customer_id, o.quantity, o.delivery_address, o.status, o.order_time, o.updated_at,
              p.name AS product_name, p.price,
              s.shop_id, s.name AS shop_name, s.owner_id
       FROM orders o
       JOIN products p ON o.product_id = p.product_id
       JOIN shops s ON o.shop_id = s.shop_id
       WHERE o.order_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found." });
    }

    const order = rows[0];
    const isCustomer = order.customer_id === user_id;
    const isShopOwner = order.owner_id === user_id;

    if (!isCustomer && !isShopOwner && role !== "admin") {
      return res.status(403).json({ message: "You do not have permission to view this order." });
    }

    return res.json({ order });
  } catch (err) {
    console.error("Get order by id error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function getOrdersByShop(req, res) {
  try {
    const { shopId } = req.params;
    const owner_id = req.user.user_id;

    const [shopRows] = await db.query("SELECT owner_id FROM shops WHERE shop_id = ?", [shopId]);
    if (shopRows.length === 0) {
      return res.status(404).json({ message: "Shop not found." });
    }
    if (shopRows[0].owner_id !== owner_id) {
      return res.status(403).json({ message: "You do not own this shop." });
    }

    const [rows] = await db.query(
      `SELECT o.order_id, o.customer_id, o.quantity, o.delivery_address, o.status, o.order_time, o.updated_at,
              p.name AS product_name, u.name AS customer_name, u.phone AS customer_phone
       FROM orders o
       JOIN products p ON o.product_id = p.product_id
       JOIN users u ON o.customer_id = u.user_id
       WHERE o.shop_id = ?
       ORDER BY o.order_time DESC`,
      [shopId]
    );

    return res.json({ orders: rows });
  } catch (err) {
    console.error("Get orders by shop error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;
    const owner_id = req.user.user_id;

    const validStatuses = ["placed", "confirmed", "out_for_delivery", "delivered", "cancelled"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const [rows] = await db.query(
      `SELECT o.status, s.owner_id
       FROM orders o JOIN shops s ON o.shop_id = s.shop_id
       WHERE o.order_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (rows[0].owner_id !== owner_id) {
      return res.status(403).json({ message: "You do not own the shop for this order." });
    }

    const currentStatus = rows[0].status;
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(newStatus)) {
      return res.status(400).json({
        message: `Cannot move an order from '${currentStatus}' to '${newStatus}'. Allowed next steps: ${
          allowedNext.length ? allowedNext.join(", ") : "none (this order is final)"
        }.`,
      });
    }

    await db.query("UPDATE orders SET status = ? WHERE order_id = ?", [newStatus, id]);

    return res.json({ message: `Order status updated to '${newStatus}'.` });
  } catch (err) {
    console.error("Update order status error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function cancelMyOrder(req, res) {
  try {
    const { id } = req.params;
    const customer_id = req.user.user_id;

    const [rows] = await db.query("SELECT customer_id, status FROM orders WHERE order_id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (rows[0].customer_id !== customer_id) {
      return res.status(403).json({ message: "You can only cancel your own orders." });
    }
    if (!["placed", "confirmed"].includes(rows[0].status)) {
      return res.status(400).json({
        message: `This order is already '${rows[0].status}' and can no longer be cancelled by you.`,
      });
    }

    await db.query("UPDATE orders SET status = 'cancelled' WHERE order_id = ?", [id]);
    return res.json({ message: "Order cancelled." });
  } catch (err) {
    console.error("Cancel my order error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  getOrdersByShop,
  updateOrderStatus,
  cancelMyOrder,
};
