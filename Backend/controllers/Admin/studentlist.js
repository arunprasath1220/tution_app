const pool = require('../../config/db');

/**
 * Get all students from the database with their subjects
 * @route GET /admin/studentsWithSubjects
 */
exports.getAllStudentsWithSubjects = async (req, res) => {
  try {
    // First get all students
    const [students] = await pool.promise().query(
      'SELECT id, name, email, role FROM user WHERE role = "student"'
    );

    if (students.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get subjects for all students
    const studentsWithSubjects = await Promise.all(
      students.map(async (student) => {
        const [subjects] = await pool.promise().query(
          `SELECT s.id, s.subjectname, s.standard, s.board 
           FROM subject s 
           INNER JOIN subjectmap sm ON s.id = sm.subject_id 
           WHERE sm.user_id = ?`,
          [student.id]
        );

        return {
          ...student,
          subjects: subjects
        };
      })
    );

    res.status(200).json({
      success: true,
      count: studentsWithSubjects.length,
      data: studentsWithSubjects
    });
  } catch (error) {
    console.error('Error fetching students with subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students with subjects',
      error: error.message
    });
  }
};

/**
 * Register a new student and map to existing subject
 * @route POST /admin/registerStudentWithSubject
 */
exports.registerStudentWithSubject = async (req, res) => {
  try {
    const { name, email, standard, subject, board } = req.body;

    // Validate input
    if (!name || !email || !standard || !subject || !board) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
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

      // First check if the subject exists with the given standard and board
      const [existingSubject] = await connection.query(
        'SELECT * FROM subject WHERE subjectname = ? AND standard = ? AND board = ?',
        [subject, standard, board]
      );

      let subjectId;

      if (existingSubject.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'The requested subject does not exist in our database. Please choose an existing subject.'
        });
      } else {
        subjectId = existingSubject[0].id;
      }

      // Insert new student
      const [studentResult] = await connection.query(
        'INSERT INTO user (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, '123', 'student'] // Default password and role
      );

      const studentId = studentResult.insertId;

      // Create mapping between student and subject
      await connection.query(
        'INSERT INTO subjectmap (user_id, subject_id) VALUES (?, ?)',
        [studentId, subjectId]
      );

      // Commit the transaction
      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Student registered successfully with subject mapping',
        data: {
          id: studentId,
          name,
          email,
          subject: {
            id: subjectId,
            name: subject,
            standard,
            board
          }
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
    console.error('Error registering student with subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register student with subject',
      error: error.message
    });
  }
};

/**
 * Get all students from the database
 * @route GET /admin/students
 */
exports.getAllStudents = async (req, res) => {
  try {
    const [rows] = await pool.promise().query(
      'SELECT id, name, email, role FROM user WHERE role = "student"'
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
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

/**
 * Register a new student
 * @route POST /admin/registerStudent
 */
exports.registerStudent = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required fields'
      });
    }

    // Set default values if not provided
    const userRole = role || 'student';
    const userPassword = password || '123'; // Default password as shown in your example

    // Check if email already exists
    const [existingUser] = await pool.promise().query(
      'SELECT * FROM user WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Insert new student
    const [result] = await pool.promise().query(
      'INSERT INTO user (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, userPassword, userRole]
    );

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        id: result.insertId,
        name,
        email,
        role: userRole
      }
    });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register student',
      error: error.message
    });
  }
};

/**
 * Update student and their subject mapping
 * @route PUT /admin/updateStudentWithSubject/:id
 */
exports.updateStudentWithSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, standard, subject, board, subjectId } = req.body;

    console.log('🔄 Starting student update process for ID:', id);
    console.log('📦 Request payload:', JSON.stringify(req.body, null, 2));

    // Validate input - less strict requirement on subject data
    if (!name || !email) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Student name and email are required'
      });
    }

    // Begin transaction
    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();
    console.log('🏦 Transaction started');

    try {
      // Check if user exists and is a student
      const [existingStudent] = await connection.query(
        'SELECT * FROM user WHERE id = ? AND role = "student"',
        [id]
      );

      if (existingStudent.length === 0) {
        console.log('❌ Student not found with ID:', id);
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      console.log('✅ Student verified:', existingStudent[0].name);

      // Check if email already exists for other users
      const [existingEmail] = await connection.query(
        'SELECT * FROM user WHERE email = ? AND id != ?',
        [email, id]
      );

      if (existingEmail.length > 0) {
        console.log('❌ Email already in use:', email);
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'This email is already used by another user'
        });
      }

      // Update user information
      const [updateResult] = await connection.query(
        'UPDATE user SET name = ?, email = ? WHERE id = ?',
        [name, email, id]
      );
      
      console.log('✅ Updated user info. Affected rows:', updateResult.affectedRows);

      // Only update subject mapping if subject information is provided
      if (standard && subject && board) {
        console.log('🔄 Processing subject update for:', subject, standard, board);
        
        // Check if the subject exists with the given standard and board
        const [existingSubject] = await connection.query(
          'SELECT * FROM subject WHERE subjectname = ? AND standard = ? AND board = ?',
          [subject, standard, board]
        );

        if (existingSubject.length === 0) {
          console.log('❌ Subject not found:', subject, standard, board);
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'The requested subject does not exist in our database.'
          });
        }
        
        const newSubjectId = existingSubject[0].id;
        console.log('✅ Found subject with ID:', newSubjectId);

        // Get all current mappings for this student
        const [existingMappings] = await connection.query(
          'SELECT * FROM subjectmap WHERE user_id = ?',
          [id]
        );
        
        console.log('📊 Current mappings:', existingMappings.length);

        if (subjectId && parseInt(subjectId) !== newSubjectId) {
          // Update specific mapping if subject ID is provided
          console.log('🔄 Updating specific mapping from ID:', subjectId, 'to', newSubjectId);
          
          const [updateMapping] = await connection.query(
            'UPDATE subjectmap SET subject_id = ? WHERE user_id = ? AND subject_id = ?',
            [newSubjectId, id, subjectId]
          );
          
          console.log('✅ Updated mapping. Affected rows:', updateMapping.affectedRows);
          
          if (updateMapping.affectedRows === 0) {
            console.log('⚠️ No rows updated. Creating new mapping instead.');
            // If no rows were updated, insert a new mapping
            await connection.query(
              'INSERT INTO subjectmap (user_id, subject_id) VALUES (?, ?)',
              [id, newSubjectId]
            );
            console.log('✅ New mapping created');
          }
        } else if (existingMappings.length === 0) {
          // If no mappings exist, create a new one
          console.log('🔄 No existing mappings found. Creating new mapping.');
          
          await connection.query(
            'INSERT INTO subjectmap (user_id, subject_id) VALUES (?, ?)',
            [id, newSubjectId]
          );
          
          console.log('✅ New mapping created');
        } else if (!subjectId) {
          // If no specific subject ID provided, update the first mapping or create a new one
          console.log('🔄 No specific subject ID provided. Handling general update.');
          
          if (existingMappings.length > 0) {
            const oldSubjectId = existingMappings[0].subject_id;
            
            if (oldSubjectId !== newSubjectId) {
              console.log('🔄 Updating first mapping from', oldSubjectId, 'to', newSubjectId);
              
              await connection.query(
                'UPDATE subjectmap SET subject_id = ? WHERE id = ?',
                [newSubjectId, existingMappings[0].id]
              );
              
              console.log('✅ Updated first mapping');
            } else {
              console.log('ℹ️ Subject unchanged, no update needed');
            }
          } else {
            // Shouldn't reach here due to earlier check, but just in case
            await connection.query(
              'INSERT INTO subjectmap (user_id, subject_id) VALUES (?, ?)',
              [id, newSubjectId]
            );
            console.log('✅ New mapping created');
          }
        }
      } else {
        console.log('ℹ️ No subject information provided, skipping subject update');
      }

      // Commit the transaction
      await connection.commit();
      console.log('✅ Transaction committed successfully');

      // Get updated data for response
      const [updatedUser] = await pool.promise().query(
        'SELECT id, name, email, role FROM user WHERE id = ?',
        [id]
      );

      const [updatedSubjects] = await pool.promise().query(
        `SELECT s.id, s.subjectname, s.standard, s.board,
         sm.id as mappingId
         FROM subject s 
         INNER JOIN subjectmap sm ON s.id = sm.subject_id 
         WHERE sm.user_id = ?`,
        [id]
      );

      res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        data: {
          ...updatedUser[0],
          subjects: updatedSubjects
        }
      });
    } catch (error) {
      console.error('❌ Transaction error:', error);
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
      console.log('🏁 Connection released');
    }
  } catch (error) {
    console.error('❌ Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message
    });
  }
};

/**
 * Delete student and their subject mappings
 * @route DELETE /admin/deleteStudent/:id
 */
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Begin transaction
    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();

    try {
      // First delete the subject mappings (will be automatically deleted if using CASCADE)
      await connection.query(
        'DELETE FROM subjectmap WHERE user_id = ?',
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
          message: 'Student not found'
        });
      }

      // Commit the transaction
      await connection.commit();

      res.status(200).json({
        success: true,
        message: 'Student deleted successfully'
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
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student',
      error: error.message
    });
  }
};

/**
 * Register a new student with multiple subjects
 * @route POST /admin/registerStudentWithSubjects
 */
exports.registerStudentWithSubjects = async (req, res) => {
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

      // Insert new student
      const [studentResult] = await connection.query(
        'INSERT INTO user (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, '123', 'student'] // Default password and role
      );

      const studentId = studentResult.insertId;
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

        // Create mapping between student and subject
        const [mappingResult] = await connection.query(
          'INSERT INTO subjectmap (user_id, subject_id) VALUES (?, ?)',
          [studentId, subjectId]
        );

        subjectMappings.push({
          id: mappingResult.insertId,
          studentId,
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
        message: 'Student registered successfully with subject mappings',
        data: {
          id: studentId,
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
    console.error('Error registering student with subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register student with subjects',
      error: error.message
    });
  }
};

/**
 * Update student and their subject mappings
 * @route PUT /admin/updateStudentWithSubjects/:id
 */
exports.updateStudentWithSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, subjects } = req.body;

    console.log('🔄 Updating student with multiple subjects. ID:', id);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    // Validate input
    if (!name || !email) {
      console.log('❌ Validation failed: Missing name or email');
      return res.status(400).json({
        success: false,
        message: 'Student name and email are required'
      });
    }

    // Check if subjects is properly formed
    if (!subjects) {
      console.log('⚠️ No subjects provided, will only update basic info');
    } else if (!Array.isArray(subjects)) {
      console.log('❌ Subjects is not an array:', typeof subjects);
      return res.status(400).json({
        success: false,
        message: 'Subjects must be an array'
      });
    } else if (subjects.length === 0) {
      console.log('⚠️ Empty subjects array provided');
    }

    // Begin transaction
    const connection = await pool.promise().getConnection();
    await connection.beginTransaction();
    console.log('🏦 Transaction started');

    try {
      // Check if student exists
      const [studentCheck] = await connection.query(
        'SELECT * FROM user WHERE id = ? AND role = "student"',
        [id]
      );

      if (studentCheck.length === 0) {
        console.log('❌ Student not found with ID:', id);
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      console.log('✅ Student verified:', studentCheck[0].name);

      // Check if email already exists for other users
      const [existingUser] = await connection.query(
        'SELECT * FROM user WHERE email = ? AND id != ?',
        [email, id]
      );

      if (existingUser.length > 0) {
        console.log('❌ Email already in use:', email);
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'This email is already used by another user'
        });
      }

      // Update user information
      const [updateResult] = await connection.query(
        'UPDATE user SET name = ?, email = ? WHERE id = ?',
        [name, email, id]
      );
      
      console.log('✅ Updated user info. Affected rows:', updateResult.affectedRows);

      // Only process subject mappings if subjects array is valid
      if (Array.isArray(subjects) && subjects.length > 0) {
        // Delete all current subject mappings for this student
        const [deleteResult] = await connection.query(
          'DELETE FROM subjectmap WHERE user_id = ?',
          [id]
        );
        
        console.log('✅ Deleted existing subject mappings. Affected rows:', deleteResult.affectedRows);

        // Create new mappings for each subject
        const newMappings = [];
        
        for (const subjectData of subjects) {
          // Check if subjectData is properly structured
          if (!subjectData || typeof subjectData !== 'object') {
            console.log('❌ Invalid subject data:', subjectData);
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: 'Invalid subject data format'
            });
          }
          
          const { standard, subject, board } = subjectData;
          
          if (!standard || !subject || !board) {
            console.log('❌ Missing subject fields:', subjectData);
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: 'Each subject must include standard, subject name, and board'
            });
          }

          console.log('🔍 Looking up subject:', subject, standard, board);
          
          // Check if the subject exists
          const [existingSubject] = await connection.query(
            'SELECT * FROM subject WHERE subjectname = ? AND standard = ? AND board = ?',
            [subject, standard, board]
          );

          if (existingSubject.length === 0) {
            console.log('❌ Subject not found:', subject, standard, board);
            await connection.rollback();
            return res.status(404).json({
              success: false,
              message: `Subject "${subject}" with standard ${standard} and board ${board} not found`
            });
          }
          
          const subjectId = existingSubject[0].id;
          console.log('✅ Found subject ID:', subjectId);

          try {
            // Create new mapping
            const [mappingResult] = await connection.query(
              'INSERT INTO subjectmap (user_id, subject_id) VALUES (?, ?)',
              [id, subjectId]
            );
            
            console.log('✅ Created mapping ID:', mappingResult.insertId);
            
            newMappings.push({
              mappingId: mappingResult.insertId,
              subjectId: subjectId,
              subject,
              standard,
              board
            });
          } catch (err) {
            console.error('❌ Error creating mapping:', err);
            await connection.rollback();
            throw err;
          }
        }

        console.log(`✅ Created ${newMappings.length} new subject mappings`);
      }

      // Commit the transaction
      await connection.commit();
      console.log('✅ Transaction committed successfully');

      // Get updated student data
      const [updatedStudent] = await pool.promise().query(
        'SELECT id, name, email, role FROM user WHERE id = ?',
        [id]
      );

      const [updatedSubjects] = await pool.promise().query(
        `SELECT s.id as subjectId, s.subjectname as subject, s.standard, s.board,
         sm.id as mappingId
         FROM subject s 
         INNER JOIN subjectmap sm ON s.id = sm.subject_id 
         WHERE sm.user_id = ?`,
        [id]
      );

      console.log('🏁 Returning updated data with', updatedSubjects.length, 'subject mappings');
      
      res.status(200).json({
        success: true,
        message: 'Student updated successfully with subject mappings',
        data: {
          ...updatedStudent[0],
          subjects: updatedSubjects
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('❌ Transaction error:', error);
      throw error;
    } finally {
      connection.release();
      console.log('🏁 Connection released');
    }
  } catch (error) {
    console.error('❌ Error updating student with subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student with subjects',
      error: error.message
    });
  }
};