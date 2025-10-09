const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/Admin/Admin');

// Routes for subject management
router.post('/addSubjects', AdminController.addSubject);
router.get('/subjects', AdminController.getAllSubjects);
router.get('/check-db', AdminController.checkDatabase); // New route for debugging

// New routes for edit and delete
router.put('/updateSubject/:id', AdminController.updateSubject);
router.delete('/deleteSubject/:id', AdminController.deleteSubject);

module.exports = router;