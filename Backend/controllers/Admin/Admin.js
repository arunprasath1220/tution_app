const db = require('../../config/db');

const AdminController = {
    addSubject: async (req, res) => {
        try {
            const { standard, subjectname, board } = req.body;
            
            console.log('📥 Received subject data:', { standard, subjectname, board });
            
            // Validate required fields
            if (!standard || !subjectname || !board) {
                console.log('❌ Missing required fields');
                return res.status(400).json({ 
                    success: false, 
                    message: 'Standard, subject name, and board are required fields' 
                });
            }
            
            // Check if standard is a number
            const standardNum = parseInt(standard);
            if (isNaN(standardNum)) {
                console.log('❌ Invalid standard:', standard);
                return res.status(400).json({ 
                    success: false, 
                    message: 'Standard must be a number' 
                });
            }
            
            // Insert subject into database (without created_at since it's not in table)
            const query = 'INSERT INTO subject (standard, subjectname, board) VALUES (?, ?, ?)';
            
            console.log('📝 Executing insert query:', query);
            console.log('📦 With values:', [standardNum, subjectname, board]);
            
            db.query(query, [standardNum, subjectname, board], (err, result) => {
                if (err) {
                    console.error('❌ Database insert error:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to add subject', 
                        error: err.message 
                    });
                }
                
                console.log('✅ Subject inserted successfully, ID:', result.insertId);
                
                // Fetch the newly created subject to return complete data
                const selectQuery = 'SELECT * FROM subject WHERE id = ?';
                db.query(selectQuery, [result.insertId], (selectErr, selectResults) => {
                    if (selectErr) {
                        console.error('❌ Error fetching created subject:', selectErr);
                        // Still return success but without the full data
                        return res.status(201).json({ 
                            success: true, 
                            message: 'Subject added successfully', 
                            data: { 
                                id: result.insertId, 
                                standard: standardNum, 
                                subjectname, 
                                board 
                            } 
                        });
                    }
                    
                    return res.status(201).json({ 
                        success: true, 
                        message: 'Subject added successfully', 
                        data: selectResults[0] 
                    });
                });
            });
        } catch (error) {
            console.error('❌ Server error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error', 
                error: error.message 
            });
        }
    },
    
    getAllSubjects: (req, res) => {
        try {
            console.log('📥 Fetching all subjects');
            
            // Simple query without created_at
            const query = 'SELECT * FROM subject ORDER BY standard, subjectname';
            
            db.query(query, (err, results) => {
                if (err) {
                    console.error('❌ Database fetch error:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to fetch subjects', 
                        error: err.message 
                    });
                }
                
                console.log(`✅ Fetched ${results.length} subjects`);
                console.log('📊 Sample subject:', results[0]);
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Subjects fetched successfully', 
                    data: results 
                });
            });
        } catch (error) {
            console.error('❌ Server error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error', 
                error: error.message 
            });
        }
    },

    // New method to check database connection and table structure
    checkDatabase: (req, res) => {
        try {
            // Check if table exists and get its structure
            const query = `
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'subject' 
                AND TABLE_SCHEMA = DATABASE()
            `;
            
            db.query(query, (err, results) => {
                if (err) {
                    console.error('❌ Database check error:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Database error', 
                        error: err.message 
                    });
                }
                
                console.log('📋 Table structure:', results);
                
                // Also get some sample data
                db.query('SELECT * FROM subject LIMIT 5', (sampleErr, sampleResults) => {
                    if (sampleErr) {
                        return res.status(200).json({ 
                            success: true, 
                            message: 'Database connected but error fetching sample data',
                            tableStructure: results,
                            error: sampleErr.message
                        });
                    }
                    
                    return res.status(200).json({ 
                        success: true, 
                        message: 'Database check successful',
                        tableStructure: results,
                        sampleData: sampleResults,
                        totalSubjects: sampleResults.length
                    });
                });
            });
        } catch (error) {
            console.error('❌ Server check error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error', 
                error: error.message 
            });
        }
    },

    /**
     * Update an existing subject
     * @route PUT /admin/updateSubject/:id
     */
    updateSubject: async (req, res) => {
        try {
            const { id } = req.params;
            const { standard, subjectname, board } = req.body;

            // Validate input
            if (!standard || !subjectname || !board) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            if (isNaN(standard) || standard <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Standard must be a positive number'
                });
            }

            // Update subject in database
            const [result] = await db.promise().query(
                'UPDATE subject SET standard = ?, subjectname = ?, board = ? WHERE id = ?',
                [standard, subjectname, board, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Subject not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Subject updated successfully'
            });
        } catch (error) {
            console.error('Error updating subject:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update subject',
                error: error.message
            });
        }
    },

    /**
     * Delete a subject
     * @route DELETE /admin/deleteSubject/:id
     */
    deleteSubject: async (req, res) => {
        try {
            const { id } = req.params;

            // Delete subject from database
            const [result] = await db.promise().query(
                'DELETE FROM subject WHERE id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Subject not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Subject deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting subject:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete subject',
                error: error.message
            });
        }
    }
};

module.exports = AdminController;