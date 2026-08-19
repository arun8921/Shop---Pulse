require('dotenv').config({ path: './.env' });
const db = require("./config/db");

async function run() {
  try {
    await db.query("ALTER TABLE shops ADD COLUMN closed_days VARCHAR(255) DEFAULT ''");
    console.log("Migration successful: added closed_days");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists");
    } else {
      console.error(err);
    }
  } finally {
    process.exit();
  }
}

run();
