const mysql = require('mysql2');

// Remove dotenv dependency
// require('dotenv').config();

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'arun@2006', // Your password is hardcoded here
  database: 't_app',
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