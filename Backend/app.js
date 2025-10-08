const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import routes
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`, req.body);
  next();
});

// Routes
app.use('/api/admin', adminRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Tution App API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;