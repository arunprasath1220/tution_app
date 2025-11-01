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
        const [facultyMaps] = await pool.promise().query(
          `SELECT subject_id FROM facultymap WHERE user_id = ? AND subject_id IS NOT NULL`,
          [faculty.id]
        );

        let subjects = [];
        if (facultyMaps.length > 0) {
          // Parse the JSON array and get all subject IDs
          const subjectIds = [];
          facultyMaps.forEach(map => {
            try {
              const ids = JSON.parse(map.subject_id);
              if (Array.isArray(ids)) {
                subjectIds.push(...ids);
              } else {
                subjectIds.push(ids);
              }
            } catch (e) {
              // If not JSON, treat as single ID
              subjectIds.push(map.subject_id);
            }
          });

          if (subjectIds.length > 0) {
            const placeholders = subjectIds.map(() => '?').join(',');
            const [subjectResults] = await pool.promise().query(
              `SELECT id, subjectname, standard, board 
               FROM subject 
               WHERE id IN (${placeholders})`,
              subjectIds
            );
            subjects = subjectResults;
          }
        }

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
      const subjectIds = [];

      // Check and validate each subject
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
        subjectIds.push(subjectId);

        subjectMappings.push({
          facultyId,
          subjectId,
          subjectName: subject,
          standard,
          board
        });
      }

      // Insert single facultymap record with all subject IDs as JSON array
      if (subjectIds.length > 0) {
        const subjectIdsJson = JSON.stringify(subjectIds);
        await connection.query(
          'INSERT INTO facultymap (user_id, subject_id) VALUES (?, ?)',
          [facultyId, subjectIdsJson]
        );
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

      // Get current subject_ids AND student_ids before deleting
      const [currentMappings] = await connection.query(
        'SELECT subject_id, student_id FROM facultymap WHERE user_id = ? LIMIT 1',
        [id]
      );

      // Extract all old subject IDs
      const oldSubjectIds = [];
      let currentStudentIds = [];
      
      if (currentMappings.length > 0) {
        // Parse subject IDs
        if (currentMappings[0].subject_id) {
          try {
            const ids = JSON.parse(currentMappings[0].subject_id);
            if (Array.isArray(ids)) {
              oldSubjectIds.push(...ids);
            } else {
              oldSubjectIds.push(ids);
            }
          } catch (e) {
            oldSubjectIds.push(currentMappings[0].subject_id);
          }
        }

        // Parse student IDs
        if (currentMappings[0].student_id) {
          try {
            const ids = JSON.parse(currentMappings[0].student_id);
            if (Array.isArray(ids)) {
              currentStudentIds = ids.map(id => Number(id));
            }
          } catch (e) {
            console.error('Failed to parse student IDs:', e);
          }
        }
      }

      // Delete only subject mappings (not student mappings) for this faculty
      await connection.query(
        'DELETE FROM facultymap WHERE user_id = ? AND subject_id IS NOT NULL',
        [id]
      );

      const subjectIds = [];

      // Validate and collect all subject IDs
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

        subjectIds.push(existingSubject[0].id);
      }

      // Insert single facultymap record with all subject IDs as JSON array
      if (subjectIds.length > 0) {
        const subjectIdsJson = JSON.stringify(subjectIds);
        await connection.query(
          'INSERT INTO facultymap (user_id, subject_id) VALUES (?, ?)',
          [id, subjectIdsJson]
        );
      }

      // Find removed subject IDs (subjects that existed before but are not in the new list)
      const removedSubjectIds = oldSubjectIds.filter(oldId => !subjectIds.includes(oldId));

      if (removedSubjectIds.length > 0) {
        console.log(`Removed subjects: ${JSON.stringify(removedSubjectIds)}`);

        // Ensure we have a list of student IDs to consider. If facultymap.student_id was empty
        // or not parsable we fallback to finding students who have mappings for any of the old subjects.
        let studentIdsToConsider = Array.isArray(currentStudentIds) && currentStudentIds.length > 0
          ? currentStudentIds
          : [];

        if (studentIdsToConsider.length === 0) {
          // Find distinct students who had mappings for any of the old subjects
          const subjectPlaceholders = removedSubjectIds.map(() => '?').join(',');
          const [studentsWithOldSubjects] = await connection.query(
            `SELECT DISTINCT user_id FROM subjectmap WHERE subject_id IN (${subjectPlaceholders})`,
            removedSubjectIds
          );
          studentIdsToConsider = studentsWithOldSubjects.map(r => Number(r.user_id));
        }

        if (studentIdsToConsider.length > 0) {
          // Delete only the subjectmap entries for the removed subjects for these students
          const subjectPlaceholders = removedSubjectIds.map(() => '?').join(',');
          const studentPlaceholders = studentIdsToConsider.map(() => '?').join(',');

          const [deleteResult] = await connection.query(
            `DELETE FROM subjectmap 
             WHERE subject_id IN (${subjectPlaceholders})
             AND user_id IN (${studentPlaceholders})`,
            [...removedSubjectIds, ...studentIdsToConsider]
          );

          console.log(`Deleted ${deleteResult.affectedRows} student-subject mappings for removed subjects`);

          // Now update facultymap.student_id to remove students who no longer have any of the remaining
          // faculty subjects. We will rebuild the array by checking for each student.
          const remainingStudentIds = [];

          for (const studentId of studentIdsToConsider) {
            // Check if student still has any of the remaining subjects mapped
            if (subjectIds.length === 0) {
              // If no remaining subjects for the faculty, student cannot remain
              continue;
            }

            const remainingPlaceholders = subjectIds.map(() => '?').join(',');
            const [studentSubjects] = await connection.query(
              `SELECT COUNT(*) as count FROM subjectmap 
               WHERE user_id = ? AND subject_id IN (${remainingPlaceholders})`,
              [studentId, ...subjectIds]
            );

            if (studentSubjects[0].count > 0) {
              remainingStudentIds.push(Number(studentId));
            }
          }

          console.log(`Students still with faculty after removal: ${remainingStudentIds.length} out of ${studentIdsToConsider.length}`);

          // Merge with any other students that may still be in facultymap.student_id but were not
          // part of studentIdsToConsider (avoid accidental deletion). Fetch current stored array one more time.
          const [latestMappingRows] = await connection.query(
            'SELECT student_id FROM facultymap WHERE user_id = ? LIMIT 1',
            [id]
          );

          let finalStudentArray = remainingStudentIds.slice();
          if (latestMappingRows.length > 0 && latestMappingRows[0].student_id) {
            try {
              const stored = typeof latestMappingRows[0].student_id === 'string' ? JSON.parse(latestMappingRows[0].student_id) : latestMappingRows[0].student_id;
              if (Array.isArray(stored)) {
                // Keep any students from stored array that still appear in the DB as having remaining subjects
                for (const s of stored) {
                  const sid = Number(s);
                  if (finalStudentArray.indexOf(sid) === -1) {
                    // Double-check student still has any of the remaining faculty subjects
                    const [check] = await connection.query(
                      `SELECT COUNT(*) as count FROM subjectmap WHERE user_id = ? AND subject_id IN (${subjectIds.map(() => '?').join(',')})`,
                      [sid, ...subjectIds]
                    );
                    if (check[0].count > 0) finalStudentArray.push(sid);
                  }
                }
              }
            } catch (e) {
              console.error('Failed to parse latest facultymap.student_id JSON:', e);
            }
          }

          const updatedStudentIdsJson = finalStudentArray.length > 0 ? JSON.stringify(finalStudentArray) : null;
          await connection.query('UPDATE facultymap SET student_id = ? WHERE user_id = ?', [updatedStudentIdsJson, id]);
        }
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