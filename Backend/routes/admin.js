const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/Admin/addsubject');
const StudentController = require('../controllers/Admin/studentlist');
const FacultyController = require('../controllers/Admin/facultylist');
const FacultyStudentMappingController = require('../controllers/Admin/facultyStudentMapping');

// Routes for subject management
router.post('/addSubjects', AdminController.addSubject);
router.get('/subjects', AdminController.getAllSubjects);
router.get('/check-db', AdminController.checkDatabase);
router.put('/updateSubject/:id', AdminController.updateSubject);
router.delete('/deleteSubject/:id', AdminController.deleteSubject);

// Faculty management routes
router.get('/facultiesWithSubjects', FacultyController.getAllFacultiesWithSubjects);
router.post('/registerFacultyWithSubjects', FacultyController.registerFacultyWithSubjects);
router.put('/updateFacultyWithSubjects/:id', FacultyController.updateFacultyWithSubjects);
router.delete('/deleteFaculty/:id', FacultyController.deleteFaculty);

// Faculty-Student Mapping routes
router.get('/facultyStudentMappings/:facultyId', FacultyStudentMappingController.getFacultyStudentMappings);
router.post('/mapStudentsToFaculty', FacultyStudentMappingController.mapStudentsToFaculty);
router.delete('/removeFacultyStudentMapping', FacultyStudentMappingController.removeFacultyStudentMapping);
router.get('/students', FacultyStudentMappingController.getAllStudents);
router.get('/unmappedStudents/:facultyId', FacultyStudentMappingController.getUnmappedStudents);
router.get('/studentsWithSubjects', StudentController.getAllStudentsWithSubjects);
router.put('/updateStudentWithSubjects/:id', StudentController.updateStudentWithSubjects);

module.exports = router;