// Backend/controllers/Admin/facultylist.js

const pool = require('../../config/db');

/**
 * Get all faculties from the database with their subjects
 * @route GET /admin/facultiesWithSubjects
 */
exports.getAllFacultiesWithSubjects = async (req, res) => {
  try {
    // First get all faculties
    const [faculties] = await pool.promise().query(
      'SELECT id, name, email FROM user WHERE role = "faculty"'
    );

    if (faculties.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get subjects and students for all faculties
    const facultiesWithData = await Promise.all(
      faculties.map(async (faculty) => {
        // Get subjects for this faculty
        const [subjects] = await pool.promise().query(
          `SELECT s.id, s.subjectname, s.standard, s.board 
           FROM subject s 
           INNER JOIN facultymap fm ON s.id = fm.subject_id 
           WHERE fm.user_id = ? AND fm.subject_id IS NOT NULL`,
          [faculty.id]
        );

        // Get students for this faculty
        const [students] = await pool.promise().query(
          `SELECT u.id, u.name, u.email 
           FROM user u 
           INNER JOIN facultymap fm ON u.id = fm.student_id 
           WHERE fm.user_id = ? AND fm.student_id IS NOT NULL 
           GROUP BY u.id`,
          [faculty.id]
        );

        return {
          ...faculty,
          subjects: subjects || [],
          students: students || []
        };
      })
    );

    res.status(200).json({
      success: true,
      count: facultiesWithData.length,
      data: facultiesWithData
    });
  } catch (error) {
    console.error('Error fetching faculties with subjects and students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch faculties with subjects and students',
      error: error.message
    });
  }
};

/**
 * Register a new faculty with subjects
 * @route POST /admin/registerFacultyWithSubjects
 */
exports.registerFacultyWithSubjects = async (req, res) => {
  try {
    const { name, email, subjects } = req.body;

    // Validate input
    if (!name || !email || !subjects || !subjects.length) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and at least one subject are required'
      });
    }

    // Begin transaction
    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();

    try {
      // Check if email already exists
      const [existingUser] = await connection.query(
        'SELECT * FROM user WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists'
        });
      }

      // Insert new faculty
      const [facultyResult] = await connection.query(
        'INSERT INTO user (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, '123', 'faculty'] // Default password and role
      );

      const facultyId = facultyResult.insertId;
      const subjectMappings = [];

      // Check and create subject mappings for each subject
      for (const subjectData of subjects) {
        const { standard, subject, board } = subjectData;

        // Check if the subject exists with the given standard and board
        const [existingSubject] = await connection.query(
          'SELECT * FROM subject WHERE subjectname = ? AND standard = ? AND board = ?',
          [subject, standard, board]
        );

        if (existingSubject.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `The subject "${subject}" with standard ${standard} and board ${board} does not exist in our database.`
          });
        }

        const subjectId = existingSubject[0].id;

        // Create mapping between faculty and subject
        const [mappingResult] = await connection.query(
          'INSERT INTO facultymap (user_id, subject_id) VALUES (?, ?)',
          [facultyId, subjectId]
        );

        subjectMappings.push({
          id: mappingResult.insertId,
          facultyId,
          subjectId,
          subjectName: subject,
          standard,
          board
        });
      }

      // Commit the transaction
      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Faculty registered successfully with subject mappings',
        data: {
          id: facultyId,
          name,
          email,
          subjects: subjectMappings
        }
      });
    } catch (error) {
      // Rollback in case of error
      await connection.rollback();
      throw error;
    } finally {
      // Release connection
      connection.release();
    }
  } catch (error) {
    console.error('Error registering faculty with subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register faculty with subjects',
      error: error.message
    });
  }
};

/**
 * Update faculty and their subject mappings
 * @route PUT /admin/updateFacultyWithSubjects/:id
 */
exports.updateFacultyWithSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, subjects } = req.body;

    // Validate input
    if (!name || !email || !subjects || !subjects.length) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and at least one subject are required'
      });
    }

    // Begin transaction
    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();

    try {
      // Check if email already exists for other users
      const [existingUser] = await connection.query(
        'SELECT * FROM user WHERE email = ? AND id != ?',
        [email, id]
      );

      if (existingUser.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'This email is already used by another user'
        });
      }

      // Update user information
      await connection.query(
        'UPDATE user SET name = ?, email = ? WHERE id = ?',
        [name, email, id]
      );

      // Delete only subject mappings (not student mappings) for this faculty
      await connection.query(
        'DELETE FROM facultymap WHERE user_id = ? AND subject_id IS NOT NULL',
        [id]
      );

      // Create new mappings for each subject
      for (const subjectData of subjects) {
        const { standard, subject, board } = subjectData;

        // Check if the subject exists
        const [existingSubject] = await connection.query(
          'SELECT * FROM subject WHERE subjectname = ? AND standard = ? AND board = ?',
          [subject, standard, board]
        );

        if (existingSubject.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `The subject "${subject}" with standard ${standard} and board ${board} does not exist in our database.`
          });
        }

        // Create new mapping
        await connection.query(
          'INSERT INTO facultymap (user_id, subject_id) VALUES (?, ?)',
          [id, existingSubject[0].id]
        );
      }

      // Commit the transaction
      await connection.commit();

      res.status(200).json({
        success: true,
        message: 'Faculty updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating faculty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update faculty',
      error: error.message
    });
  }
};

/**
 * Delete faculty and their subject mappings
 * @route DELETE /admin/deleteFaculty/:id
 */
exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    // Begin transaction
    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();

    try {
      // First delete the mappings
      await connection.query(
        'DELETE FROM facultymap WHERE user_id = ?',
        [id]
      );

      // Then delete the user
      const [result] = await connection.query(
        'DELETE FROM user WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Faculty not found'
        });
      }

      // Commit the transaction
      await connection.commit();

      res.status(200).json({
        success: true,
        message: 'Faculty deleted successfully'
      });
    } catch (error) {
      // Rollback in case of error
      await connection.rollback();
      throw error;
    } finally {
      // Release connection
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting faculty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete faculty',
      error: error.message
    });
  }
};