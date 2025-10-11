const pool = require('../../config/db');

/**
 * Get all students mapped to a specific faculty from the JSON array.
 * @route GET /admin/facultyStudentMappings/:facultyId
 */
exports.getFacultyStudentMappings = async (req, res) => {
  try {
    const { facultyId } = req.params;

    // 1. Get the mapping record for the faculty
    const [mappings] = await pool.promise().query(
      'SELECT student_id FROM facultymap WHERE user_id = ? LIMIT 1',
      [facultyId]
    );

    if (mappings.length === 0 || !mappings[0].student_id) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // 2. Parse the JSON array of student IDs
    let studentIds;
    try {
      const storedIds = mappings[0].student_id;
      studentIds = typeof storedIds === 'string' ? JSON.parse(storedIds) : storedIds;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
    } catch (e) {
      console.error("Failed to parse student_id JSON:", mappings[0].student_id);
      return res.status(500).json({ success: false, message: 'Corrupted student mapping data.' });
    }
    
    // Ensure IDs are numbers
    const numericStudentIds = studentIds.map(id => Number(id));

    // 3. Fetch details for all students in the array
    const [students] = await pool.promise().query(
      'SELECT id, name, email FROM user WHERE id IN (?)',
      [numericStudentIds]
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
 * Map multiple students to a faculty by storing them in a JSON array.
 * @route POST /admin/mapStudentsToFaculty
 */
exports.mapStudentsToFaculty = async (req, res) => {
  try {
    const { facultyId, studentIds } = req.body;

    // 1. Validate input
    if (!facultyId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Faculty ID and an array of student IDs are required'
      });
    }

    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 2. Find an existing mapping for the faculty (could be for a subject or students)
      const [mappings] = await connection.query(
        'SELECT id, student_id FROM facultymap WHERE user_id = ? LIMIT 1',
        [facultyId]
      );

      let existingStudentIds = [];
      let mappingId = null;

      if (mappings.length > 0) {
        mappingId = mappings[0].id;
        // Safely parse the student_id column
        if (mappings[0].student_id) {
          try {
            // It might be a string or already an array
            const storedIds = typeof mappings[0].student_id === 'string' 
              ? JSON.parse(mappings[0].student_id) 
              : mappings[0].student_id;
            if (Array.isArray(storedIds)) {
              existingStudentIds = storedIds.map(id => Number(id));
            }
          } catch (e) {
            console.error("Failed to parse existing student_id JSON:", mappings[0].student_id);
            // Continue with an empty array if parsing fails
          }
        }
      }

      // 3. Merge new student IDs, ensuring no duplicates
      const newStudentIds = studentIds.map(id => Number(id));
      const combinedIds = [...new Set([...existingStudentIds, ...newStudentIds])];
      const finalStudentIdArray = JSON.stringify(combinedIds);

      // 4. Update or Insert the mapping
      if (mappingId) {
        // If a mapping exists, update its student_id array
        await connection.query(
          'UPDATE facultymap SET student_id = ? WHERE id = ?',
          [finalStudentIdArray, mappingId]
        );
      } else {
        // If no mapping exists for this faculty, create a new one
        await connection.query(
          'INSERT INTO facultymap (user_id, student_id) VALUES (?, ?)',
          [facultyId, finalStudentIdArray]
        );
      }

      await connection.commit();
      connection.release();

      return res.status(200).json({
        success: true,
        message: 'Students mapped successfully.',
        data: {
          facultyId,
          studentIds: combinedIds
        }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Transaction Error in mapStudentsToFaculty:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error during student mapping.',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error in mapStudentsToFaculty:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to map students to faculty',
      error: error.message
    });
  }
};

/**
 * Remove a student mapping from the JSON array for a faculty.
 * @route DELETE /admin/removeFacultyStudentMapping
 */
exports.removeFacultyStudentMapping = async (req, res) => {
  try {
    const { facultyId, studentId } = req.body;

    if (!facultyId || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Faculty ID and Student ID are required'
      });
    }

    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 1. Get the current mapping
      const [mappings] = await connection.query(
        'SELECT id, student_id FROM facultymap WHERE user_id = ? LIMIT 1',
        [facultyId]
      );

      if (mappings.length === 0 || !mappings[0].student_id) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'No mapping found for this faculty.' });
      }

      const mappingId = mappings[0].id;
      let studentIds;
      try {
        const storedIds = mappings[0].student_id;
        studentIds = typeof storedIds === 'string' ? JSON.parse(storedIds) : storedIds;
      } catch (e) {
        await connection.rollback();
        return res.status(500).json({ success: false, message: 'Corrupted student mapping data.' });
      }

      // 2. Remove the student ID from the array
      const studentIdToRemove = Number(studentId);
      const updatedStudentIds = studentIds.filter(id => Number(id) !== studentIdToRemove);

      if (updatedStudentIds.length === studentIds.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Student is not mapped to this faculty.' });
      }

      // 3. Update the record with the new array
      const finalStudentIdArray = JSON.stringify(updatedStudentIds);
      await connection.query(
        'UPDATE facultymap SET student_id = ? WHERE id = ?',
        [finalStudentIdArray, mappingId]
      );

      await connection.commit();
      connection.release();

      return res.status(200).json({
        success: true,
        message: 'Student mapping removed successfully.'
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error removing faculty-student mapping:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove student mapping',
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