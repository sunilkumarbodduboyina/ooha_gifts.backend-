const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ooha_gifts',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
});

/** Run a query using the pool. */
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/** Run one query and return the first row (or null). */
async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? rows[0] : null;
}

/** Begin a transaction and return a dedicated connection. */
async function begin() {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  return conn;
}

async function commit(conn) {
  await conn.commit();
  conn.release();
}

async function rollback(conn) {
  try {
    await conn.rollback();
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, one, begin, commit, rollback };
