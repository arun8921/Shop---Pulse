require('dotenv').config({ path: './.env' });
const db = require("./config/db");

async function run() {
  try {
    await db.query("ALTER TABLE shops ADD COLUMN business_category VARCHAR(100) NULL");
    await db.query("ALTER TABLE shops ADD COLUMN business_sub_category VARCHAR(100) NULL");
    console.log("Migration successful");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Columns already exist");
    } else {
      console.error(err);
    }
  } finally {
    process.exit();
  }
}

run();
