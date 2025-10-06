const mysql = require('mysql2');
require('dotenv').config();

const DB_PASS = process.env.DB_PASSWORD ?? process.env.DB_PASS ?? '';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: DB_PASS,
  database: process.env.DB_NAME || 't_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to the MySQL database.');
    connection.release();
  }
});

module.exports = pool;
