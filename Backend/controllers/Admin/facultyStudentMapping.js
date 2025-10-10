const pool = require('../../config/db');

/**
 * Get all students mapped to a specific faculty
 * @route GET /admin/facultyStudentMappings/:facultyId
 */
exports.getFacultyStudentMappings = async (req, res) => {
  try {
    const { facultyId } = req.params;

    // Validate faculty ID
    const [faculty] = await pool.promise().query(
      'SELECT * FROM user WHERE id = ? AND role = "faculty"',
      [facultyId]
    );

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Get all students mapped to this faculty
    const [students] = await pool.promise().query(
      `SELECT u.id, u.name, u.email 
       FROM user u 
       INNER JOIN facultymap fm ON u.id = fm.student_id 
       WHERE fm.user_id = ? AND fm.student_id IS NOT NULL
       GROUP BY u.id`,
      [facultyId]
    );

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error fetching faculty-student mappings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch faculty-student mappings',
      error: error.message
    });
  }
};

/**
 * Map multiple students to a faculty
 * @route POST /admin/mapStudentsToFaculty
 */
exports.mapStudentsToFaculty = async (req, res) => {
  try {
    const { facultyId, studentIds } = req.body;

    // Validate request data
    if (!facultyId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Faculty ID and at least one student ID are required'
      });
    }

    // Begin transaction
    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();

    try {
      // Validate faculty exists and is a faculty
      const [faculty] = await connection.query(
        'SELECT * FROM user WHERE id = ? AND role = "faculty"',
        [facultyId]
      );

      if (faculty.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Faculty not found'
        });
      }

      // Validate all students exist and are students
      const [students] = await connection.query(
        'SELECT * FROM user WHERE id IN (?) AND role = "student"',
        [studentIds]
      );

      if (students.length !== studentIds.length) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'One or more students not found'
        });
      }

      // Get existing mappings for this faculty
      const [existingMappings] = await connection.query(
        'SELECT student_id FROM facultymap WHERE user_id = ? AND student_id IS NOT NULL',
        [facultyId]
      );

      const existingStudentIds = existingMappings.map(mapping => mapping.student_id);

      // Filter out students that are already mapped
      const studentsToMap = studentIds.filter(id => !existingStudentIds.includes(parseInt(id)));

      // Create new mappings
      if (studentsToMap.length > 0) {
        // Insert each student individually to support your table structure
        for (const studentId of studentsToMap) {
          await connection.query(
            'INSERT INTO facultymap (user_id, subject_id, student_id) VALUES (?, NULL, ?)',
            [facultyId, studentId]
          );
        }
      }

      // Commit transaction
      await connection.commit();

      return res.status(200).json({
        success: true,
        message: `Successfully mapped ${studentsToMap.length} students to faculty`,
        studentsAdded: studentsToMap.length,
        alreadyMapped: studentIds.length - studentsToMap.length
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error mapping students to faculty:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to map students to faculty',
      error: error.message
    });
  }
};

/**
 * Remove student mapping from faculty
 * @route DELETE /admin/removeFacultyStudentMapping
 */
exports.removeFacultyStudentMapping = async (req, res) => {
  try {
    const { facultyId, studentId } = req.body;

    // Validate request data
    if (!facultyId || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Faculty ID and student ID are required'
      });
    }

    // Delete the mapping
    const [result] = await pool.promise().query(
      'DELETE FROM facultymap WHERE user_id = ? AND student_id = ?',
      [facultyId, studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mapping not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student mapping removed successfully'
    });
  } catch (error) {
    console.error('Error removing faculty-student mapping:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove faculty-student mapping',
      error: error.message
    });
  }
};

/**
 * Get all unmapped students for a faculty
 * @route GET /admin/unmappedStudents/:facultyId
 */
exports.getUnmappedStudents = async (req, res) => {
  try {
    const { facultyId } = req.params;

    // Validate faculty ID
    const [faculty] = await pool.promise().query(
      'SELECT * FROM user WHERE id = ? AND role = "faculty"',
      [facultyId]
    );

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Get students already mapped to this faculty
    const [mappedStudents] = await pool.promise().query(
      `SELECT student_id FROM facultymap 
       WHERE user_id = ? AND student_id IS NOT NULL`,
      [facultyId]
    );

    const mappedStudentIds = mappedStudents.map(mapping => mapping.student_id);
    
    // Get all students who aren't mapped to this faculty
    let query = 'SELECT id, name, email FROM user WHERE role = "student"';
    let params = [];
    
    if (mappedStudentIds.length > 0) {
      query += ' AND id NOT IN (?)';
      params.push(mappedStudentIds);
    }

    const [unmappedStudents] = await pool.promise().query(query, params);

    return res.status(200).json({
      success: true,
      count: unmappedStudents.length,
      data: unmappedStudents
    });
  } catch (error) {
    console.error('Error fetching unmapped students:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unmapped students',
      error: error.message
    });
  }
};

/**
 * Get all students from the database (for mapping to faculty)
 * @route GET /admin/students
 */
exports.getAllStudents = async (req, res) => {
  try {
    // Get all students
    const [students] = await pool.promise().query(
      'SELECT id, name, email FROM user WHERE role = "student"'
    );

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};