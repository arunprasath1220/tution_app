const pool = require('../../config/db');

/**
 * Get all students mapped to a specific faculty with their subjects from subjectmap table.
 * Only shows subjects that belong to this faculty.
 * @route GET /admin/facultyStudentMappings/:facultyId
 */
exports.getFacultyStudentMappings = async (req, res) => {
  try {
    const { facultyId } = req.params;

    // 1. Get facultymap row for this faculty (we need both subject_id and student_id)
    const [facultymapRows] = await pool.promise().query(
      'SELECT subject_id, student_id FROM facultymap WHERE user_id = ? LIMIT 1',
      [facultyId]
    );

    // Parse faculty's subject IDs from JSON array (may be empty/null)
    let facultySubjectIds = [];
    if (facultymapRows.length > 0 && facultymapRows[0].subject_id) {
      try {
        const storedIds = facultymapRows[0].subject_id;
        const parsedIds = typeof storedIds === 'string' ? JSON.parse(storedIds) : storedIds;
        if (Array.isArray(parsedIds)) {
          facultySubjectIds = parsedIds.map(id => Number(id));
        }
      } catch (e) {
        console.error('Failed to parse faculty subject_id JSON:', facultymapRows[0].subject_id);
      }
    }

    // Parse student IDs from facultymap (if present). If no students mapped, return empty list.
    let studentIds = [];
    if (facultymapRows.length > 0 && facultymapRows[0].student_id) {
      try {
        const stored = facultymapRows[0].student_id;
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        if (Array.isArray(parsed) && parsed.length > 0) {
          studentIds = parsed.map(id => Number(id));
        }
      } catch (e) {
        console.error('Failed to parse student_id JSON:', facultymapRows[0].student_id);
        return res.status(500).json({ success: false, message: 'Corrupted student mapping data.' });
      }
    }

    if (!studentIds || studentIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const numericStudentIds = studentIds.map(id => Number(id));

    // 3. Fetch student details
    const [students] = await pool.promise().query(
      'SELECT id, name, email FROM user WHERE id IN (?)',
      [numericStudentIds]
    );

    // 4. For each student, fetch ONLY subjects that belong to this faculty (if the faculty has subjects)
    // If the faculty has no subjects, return the students with an empty subjects array so the UI
    // still shows the mapped students after subject deletions.
    const studentsWithSubjects = await Promise.all(
      students.map(async (student) => {
        if (!facultySubjectIds || facultySubjectIds.length === 0) {
          return {
            ...student,
            subjects: []
          };
        }

        const placeholders = facultySubjectIds.map(() => '?').join(',');
        const [subjectMappings] = await pool.promise().query(
          `SELECT s.id, s.subjectname, s.standard, s.board 
           FROM subjectmap sm
           INNER JOIN subject s ON sm.subject_id = s.id
           WHERE sm.user_id = ? AND sm.subject_id IN (${placeholders})`,
          [student.id, ...facultySubjectIds]
        );

        return {
          ...student,
          subjects: subjectMappings
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: studentsWithSubjects.length,
      data: studentsWithSubjects
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
 * Map multiple students to a faculty with subject selection by storing in subjectmap table.
 * @route POST /admin/mapStudentsToFaculty
 */
exports.mapStudentsToFaculty = async (req, res) => {
  try {
    const { facultyId, studentIds, subjectIds } = req.body;

    // 1. Validate input
    if (!facultyId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Faculty ID and an array of student IDs are required'
      });
    }

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject must be selected'
      });
    }

    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 2. Insert mappings into subjectmap table for each student-subject combination
      const mappingPromises = [];
      
      for (const studentId of studentIds) {
        for (const subjectId of subjectIds) {
          // Check if mapping already exists
          const [existing] = await connection.query(
            'SELECT id FROM subjectmap WHERE user_id = ? AND subject_id = ?',
            [studentId, subjectId]
          );
          
          // Only insert if mapping doesn't exist
          if (existing.length === 0) {
            mappingPromises.push(
              connection.query(
                'INSERT INTO subjectmap (user_id, subject_id) VALUES (?, ?)',
                [studentId, subjectId]
              )
            );
          }
        }
      }

      await Promise.all(mappingPromises);

      // 3. Also maintain the facultymap student_id array for backward compatibility
      const [mappings] = await connection.query(
        'SELECT id, student_id FROM facultymap WHERE user_id = ? LIMIT 1',
        [facultyId]
      );

      let existingStudentIds = [];
      let mappingId = null;

      if (mappings.length > 0) {
        mappingId = mappings[0].id;
        if (mappings[0].student_id) {
          try {
            const storedIds = typeof mappings[0].student_id === 'string' 
              ? JSON.parse(mappings[0].student_id) 
              : mappings[0].student_id;
            if (Array.isArray(storedIds)) {
              existingStudentIds = storedIds.map(id => Number(id));
            }
          } catch (e) {
            console.error("Failed to parse existing student_id JSON:", mappings[0].student_id);
          }
        }
      }

      const newStudentIds = studentIds.map(id => Number(id));
      const combinedIds = [...new Set([...existingStudentIds, ...newStudentIds])];
      const finalStudentIdArray = JSON.stringify(combinedIds);

      if (mappingId) {
        await connection.query(
          'UPDATE facultymap SET student_id = ? WHERE id = ?',
          [finalStudentIdArray, mappingId]
        );
      } else {
        await connection.query(
          'INSERT INTO facultymap (user_id, student_id) VALUES (?, ?)',
          [facultyId, finalStudentIdArray]
        );
      }

      await connection.commit();
      connection.release();

      return res.status(200).json({
        success: true,
        message: 'Students mapped successfully with selected subjects.',
        data: {
          facultyId,
          studentIds: combinedIds,
          subjectIds
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
 * Remove a student mapping from a specific faculty only (removes only faculty's subjects).
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
      // 1. Get faculty's subject IDs
      const [facultySubjects] = await connection.query(
        'SELECT subject_id FROM facultymap WHERE user_id = ? AND subject_id IS NOT NULL',
        [facultyId]
      );

      if (facultySubjects.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'No subjects found for this faculty.' });
      }

      // Parse faculty's subject IDs
      let facultySubjectIds = [];
      try {
        const storedIds = facultySubjects[0].subject_id;
        const parsedIds = typeof storedIds === 'string' ? JSON.parse(storedIds) : storedIds;
        if (Array.isArray(parsedIds)) {
          facultySubjectIds = parsedIds.map(id => Number(id));
        }
      } catch (e) {
        await connection.rollback();
        return res.status(500).json({ success: false, message: 'Corrupted faculty subject data.' });
      }

      if (facultySubjectIds.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'No subjects found for this faculty.' });
      }

      // 2. Delete from subjectmap ONLY for this faculty's subjects
      const placeholders = facultySubjectIds.map(() => '?').join(',');
      const [deleteResult] = await connection.query(
        `DELETE FROM subjectmap WHERE user_id = ? AND subject_id IN (${placeholders})`,
        [studentId, ...facultySubjectIds]
      );

      // 3. Update facultymap student_id array
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

      const studentIdToRemove = Number(studentId);
      const updatedStudentIds = studentIds.filter(id => Number(id) !== studentIdToRemove);

      if (updatedStudentIds.length === studentIds.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Student is not mapped to this faculty.' });
      }

      const finalStudentIdArray = JSON.stringify(updatedStudentIds);
      await connection.query(
        'UPDATE facultymap SET student_id = ? WHERE id = ?',
        [finalStudentIdArray, mappingId]
      );

      await connection.commit();
      connection.release();

      return res.status(200).json({
        success: true,
        message: `Student mapping removed successfully from this faculty (${deleteResult.affectedRows} subject(s) unmapped).`
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