const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/Admin/Admin');

// Routes for subject management
router.post('/subjects', AdminController.addSubject);
router.get('/subjects', AdminController.getAllSubjects);
router.get('/check-db', AdminController.checkDatabase); // New route for debugging

module.exports = router;