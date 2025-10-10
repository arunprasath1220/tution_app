import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  KeyboardAvoidingView,
  Platform, 
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  SectionList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API_URL } from '../../utils/env';

// Theme color and its variants
const THEME = {
  primary: '#4C1D95',
  light: '#6D28D9',
  lighter: '#8B5CF6',
  lightest: '#A78BFA',
  dark: '#3B0764',
  text: {
    light: '#F5F3FF',
    dark: '#1F0942',
    muted: '#7C3AED'
  },
  danger: '#DC2626'
};

export default function StudentList() {
  // Keep all existing state variables
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // For filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // For adding new student with multiple subjects
  const [subjectForms, setSubjectForms] = useState([
    { standard: '', subject: '', board: '' }
  ]);
  
  // For editing student with multiple subjects
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSubjectForms, setEditSubjectForms] = useState([]);
  
  // For grouped display
  const [groupedData, setGroupedData] = useState([]);
  const [expandedBoards, setExpandedBoards] = useState({});
  const [expandedStandards, setExpandedStandards] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});

  useEffect(() => {
    fetchStudents();
  }, []);
  
  // Apply filter whenever searchQuery or students list changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      const lowercasedQuery = searchQuery.toLowerCase();
      
      const filtered = students.filter(student => {
        // Check student name and email
        const nameMatch = student.name.toLowerCase().includes(lowercasedQuery);
        const emailMatch = student.email.toLowerCase().includes(lowercasedQuery);
        
        // Check if any subject matches the query
        const subjectMatch = student.subjects && student.subjects.some(subj => 
          subj.subjectname.toLowerCase().includes(lowercasedQuery) || 
          subj.board.toLowerCase().includes(lowercasedQuery) ||
          subj.standard.toString().includes(lowercasedQuery)
        );
        
        return nameMatch || emailMatch || subjectMatch;
      });
      
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  // Organize data into grouped format whenever filtered students change
  useEffect(() => {
    organizeStudentsByHierarchy(filteredStudents);
  }, [filteredStudents]);

  const fetchStudents = async () => {
    try {
      setRefreshing(true);
      console.log('🔍 Fetching students from:', `${API_URL}/admin/studentsWithSubjects`);
      
      const response = await fetch(`${API_URL}/admin/studentsWithSubjects`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Fetch response:', data);
      
      if (data.success) {
        setStudents(data.data || []);
        setFilteredStudents(data.data || []); // Initialize filtered list with all students
        console.log(`👨‍🎓 Loaded ${data.data?.length || 0} students`);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      Alert.alert('Error', `Could not load students: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Organize students into a hierarchical structure by Board -> Standard -> Subject
  const organizeStudentsByHierarchy = (studentsList) => {
    const boardsMap = {};
    
    // First pass: Create structure for boards, standards, and subjects
    studentsList.forEach(student => {
      if (!student.subjects || student.subjects.length === 0) return;
      
      student.subjects.forEach(subject => {
        const board = subject.board;
        const standard = subject.standard.toString();
        const subjectName = subject.subjectname;
        
        // Initialize board if it doesn't exist
        if (!boardsMap[board]) {
          boardsMap[board] = {
            board,
            standards: {}
          };
        }
        
        // Initialize standard if it doesn't exist
        if (!boardsMap[board].standards[standard]) {
          boardsMap[board].standards[standard] = {
            standard,
            subjects: {}
          };
        }
        
        // Initialize subject if it doesn't exist
        if (!boardsMap[board].standards[standard].subjects[subjectName]) {
          boardsMap[board].standards[standard].subjects[subjectName] = {
            subject: subjectName,
            students: []
          };
        }
        
        // Add student to the subject if they're not already there
        const studentExists = boardsMap[board].standards[standard].subjects[subjectName].students.some(
          s => s.id === student.id
        );
        
        if (!studentExists) {
          boardsMap[board].standards[standard].subjects[subjectName].students.push({
            ...student,
            currentSubject: subject // Store the current subject context
          });
        }
      });
    });
    
    // Second pass: Convert the maps to arrays for rendering
    const boardsArray = Object.values(boardsMap).map(boardData => ({
      board: boardData.board,
      standards: Object.values(boardData.standards).map(standardData => ({
        standard: standardData.standard,
        subjects: Object.values(standardData.subjects).map(subjectData => ({
          subject: subjectData.subject,
          students: subjectData.students
        }))
      }))
    }));
    
    // Sort boards alphabetically
    boardsArray.sort((a, b) => a.board.localeCompare(b.board));
    
    // Sort standards numerically
    boardsArray.forEach(boardData => {
      boardData.standards.sort((a, b) => parseInt(a.standard) - parseInt(b.standard));
      
      // Sort subjects alphabetically
      boardData.standards.forEach(standardData => {
        standardData.subjects.sort((a, b) => a.subject.localeCompare(b.subject));
        
        // Sort students alphabetically
        standardData.subjects.forEach(subjectData => {
          subjectData.students.sort((a, b) => a.name.localeCompare(b.name));
        });
      });
    });
    
    setGroupedData(boardsArray);
  };

  // Toggle board expansion
  const toggleBoardExpansion = (board) => {
    setExpandedBoards(prev => ({
      ...prev,
      [board]: !prev[board]
    }));
  };

  // Toggle standard expansion
  const toggleStandardExpansion = (boardStandard) => {
    setExpandedStandards(prev => ({
      ...prev,
      [boardStandard]: !prev[boardStandard]
    }));
  };

  // Toggle subject expansion
  const toggleSubjectExpansion = (boardStandardSubject) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [boardStandardSubject]: !prev[boardStandardSubject]
    }));
  };
  
  // Add new subject form
  const addSubjectForm = () => {
    setSubjectForms([
      ...subjectForms,
      { standard: '', subject: '', board: '' }
    ]);
  };

  // Add new subject form in edit mode
  const addEditSubjectForm = () => {
    setEditSubjectForms([
      ...editSubjectForms,
      { standard: '', subject: '', board: '', id: null }
    ]);
  };

  // Remove subject form
  const removeSubjectForm = (index) => {
    if (subjectForms.length > 1) {
      setSubjectForms(subjectForms.filter((_, i) => i !== index));
    }
  };

  // Remove subject form in edit mode
  const removeEditSubjectForm = (index) => {
    if (editSubjectForms.length > 1) {
      setEditSubjectForms(editSubjectForms.filter((_, i) => i !== index));
    }
  };

  // Update subject form values
  const updateSubjectForm = (index, field, value) => {
    const updatedForms = [...subjectForms];
    updatedForms[index] = { ...updatedForms[index], [field]: value };
    setSubjectForms(updatedForms);
  };

  // Update edit subject form values
  const updateEditSubjectForm = (index, field, value) => {
    const updatedForms = [...editSubjectForms];
    updatedForms[index] = { ...updatedForms[index], [field]: value };
    setEditSubjectForms(updatedForms);
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!name.trim()) {
      Alert.alert('Error', 'Student name is required');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate subject forms
    for (let i = 0; i < subjectForms.length; i++) {
      const form = subjectForms[i];
      if (!form.standard || !form.subject || !form.board) {
        Alert.alert('Error', `Please complete all fields for Subject ${i + 1}`);
        return;
      }
    }

    try {
      setLoading(true);
      console.log('📤 Registering student with multiple subjects');
      
      const studentData = {
        name: name.trim(),
        email: email.trim(),
        subjects: subjectForms
      };
      
      const response = await fetch(`${API_URL}/admin/registerStudentWithSubjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData)
      });
      
      const data = await response.json();
      console.log('✅ Register student response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Student added successfully');
        setName('');
        setEmail('');
        setSubjectForms([{ standard: '', subject: '', board: '' }]);
        setModalVisible(false);
        fetchStudents(); // Refresh the list
      } else {
        Alert.alert('Error', data.message || 'Failed to add student');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Error', `Could not add student: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open action modal when info icon is clicked
  const openActionModal = (student) => {
    setSelectedStudent(student);
    setActionModalVisible(true);
  };

  // Open edit modal with student data
  const openEditModal = () => {
    if (selectedStudent) {
      setEditId(selectedStudent.id);
      setEditName(selectedStudent.name);
      setEditEmail(selectedStudent.email);
      
      if (selectedStudent.subjects && selectedStudent.subjects.length > 0) {
        // Map all subject data to edit forms
        const subjectForms = selectedStudent.subjects.map(subj => ({
          standard: subj.standard.toString(),
          subject: subj.subjectname,
          board: subj.board
        }));
        console.log('Mapped subject forms:', subjectForms);
        setEditSubjectForms(subjectForms);
      } else {
        // Initialize with empty form if no subjects
        setEditSubjectForms([{ standard: '', subject: '', board: '' }]);
      }
      
      setActionModalVisible(false);
      setEditModalVisible(true);
    }
  };

  // Handle edit student submission
  const handleEditSubmit = async () => {
    // Validate inputs
    if (!editName.trim()) {
      Alert.alert('Error', 'Student name is required');
      return;
    }
    
    if (!editEmail.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate subject forms
    for (let i = 0; i < editSubjectForms.length; i++) {
      const form = editSubjectForms[i];
      if (!form.standard || !form.subject || !form.board) {
        Alert.alert('Error', `Please complete all fields for Subject ${i + 1}`);
        return;
      }
    }

    try {
      setLoading(true);
      console.log('📝 Updating student:', editId);
      
      // Format the subject data for backend
      const subjectsToSubmit = editSubjectForms.map(form => ({
        standard: form.standard,
        subject: form.subject,
        board: form.board
      }));
      
      const studentData = {
        name: editName.trim(),
        email: editEmail.trim(),
        subjects: subjectsToSubmit
      };
      
      console.log('Student data to submit:', studentData);
      
      const response = await fetch(`${API_URL}/admin/updateStudentWithSubjects/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData)
      });
      
      const data = await response.json();
      console.log('✅ Update student response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Student updated successfully');
        setEditModalVisible(false);
        fetchStudents(); // Refresh the list
      } else {
        Alert.alert('Error', data.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      Alert.alert('Error', `Could not update student: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete student
  const handleDeleteStudent = async () => {
    try {
      setLoading(true);
      console.log('🗑️ Deleting student:', selectedStudent.id);
      
      const response = await fetch(`${API_URL}/admin/deleteStudent/${selectedStudent.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('✅ Delete student response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Student deleted successfully');
        setActionModalVisible(false);
        fetchStudents(); // Refresh the list
      } else {
        Alert.alert('Error', data.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      Alert.alert('Error', `Could not delete student: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStudentItem = ({ item }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
        
        {item.subjects && item.subjects.length > 0 ? (
          <View style={styles.subjectsContainer}>
            {item.subjects.map((subj, index) => (
              <View key={index} style={styles.subjectChip}>
                <Text style={styles.subjectText}>
                  {subj.subjectname} ({subj.board}, Std {subj.standard})
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noSubjectsText}>No subjects assigned</Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.infoIconContainer}
        onPress={() => openActionModal(item)}
      >
        <View style={styles.infoCircle}>
          <Icon name="info" size={16} color={THEME.text.light} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderSubjectForm = (form, index) => (
    <View key={index} style={styles.subjectFormContainer}>
      <View style={styles.subjectFormHeader}>
        <Text style={styles.subjectFormTitle}>Subject {index + 1}</Text>
        {index > 0 && (
          <TouchableOpacity 
            onPress={() => removeSubjectForm(index)}
            style={styles.removeSubjectButton}
          >
            <Icon name="delete" size={20} color={THEME.danger} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.inputLabel}>Standard *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 11, 12"
        value={form.standard}
        onChangeText={(text) => updateSubjectForm(index, 'standard', text)}
        keyboardType="numeric"
        placeholderTextColor="#aaa"
      />
      
      <Text style={styles.inputLabel}>Subject *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Math, Physics"
        value={form.subject}
        onChangeText={(text) => updateSubjectForm(index, 'subject', text)}
        placeholderTextColor="#aaa"
      />
      
      <Text style={styles.inputLabel}>Board *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., CBSE, ICSE"
        value={form.board}
        onChangeText={(text) => updateSubjectForm(index, 'board', text)}
        placeholderTextColor="#aaa"
      />
    </View>
  );

  const renderEditSubjectForm = (form, index) => (
    <View key={index} style={styles.subjectFormContainer}>
      <View style={styles.subjectFormHeader}>
        <Text style={styles.subjectFormTitle}>Subject {index + 1}</Text>
        {index > 0 && (
          <TouchableOpacity 
            onPress={() => removeEditSubjectForm(index)}
            style={styles.removeSubjectButton}
          >
            <Icon name="delete" size={20} color={THEME.danger} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.inputLabel}>Standard *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 11, 12"
        value={form.standard}
        onChangeText={(text) => updateEditSubjectForm(index, 'standard', text)}
        keyboardType="numeric"
        placeholderTextColor="#aaa"
      />
      
      <Text style={styles.inputLabel}>Subject *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Math, Physics"
        value={form.subject}
        onChangeText={(text) => updateEditSubjectForm(index, 'subject', text)}
        placeholderTextColor="#aaa"
      />
      
      <Text style={styles.inputLabel}>Board *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., CBSE, ICSE"
        value={form.board}
        onChangeText={(text) => updateEditSubjectForm(index, 'board', text)}
        placeholderTextColor="#aaa"
      />
    </View>
  );

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Add new method to render grouped students
  const renderGroupedStudents = () => {
    if (groupedData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon 
            name={isSearching ? "search-off" : "school"} 
            size={60} 
            color={THEME.lightest} 
          />
          <Text style={styles.emptyText}>
            {isSearching ? "No matching students found" : "No students found"}
          </Text>
          <Text style={styles.emptySubText}>
            {isSearching 
              ? "Try a different search term" 
              : "Add students by clicking the button above"
            }
          </Text>
        </View>
      );
    }
    
    return (
      <ScrollView style={styles.groupedListContainer}>
        {groupedData.map((boardData, boardIndex) => (
          <View key={boardIndex} style={styles.boardContainer}>
            <TouchableOpacity
              style={styles.boardHeader}
              onPress={() => toggleBoardExpansion(boardData.board)}
            >
              <Text style={styles.boardTitle}>{boardData.board}</Text>
              <Icon 
                name={expandedBoards[boardData.board] ? "expand-less" : "expand-more"} 
                size={24} 
                color={THEME.primary} 
              />
            </TouchableOpacity>
            
            {expandedBoards[boardData.board] && boardData.standards.map((standardData, standardIndex) => (
              <View key={standardIndex} style={styles.standardContainer}>
                <TouchableOpacity
                  style={styles.standardHeader}
                  onPress={() => toggleStandardExpansion(`${boardData.board}-${standardData.standard}`)}
                >
                  <Text style={styles.standardTitle}>Standard {standardData.standard}</Text>
                  <Icon 
                    name={expandedStandards[`${boardData.board}-${standardData.standard}`] ? "expand-less" : "expand-more"} 
                    size={22} 
                    color={THEME.light} 
                  />
                </TouchableOpacity>
                
                {expandedStandards[`${boardData.board}-${standardData.standard}`] && standardData.subjects.map((subjectData, subjectIndex) => (
                  <View key={subjectIndex} style={styles.subjectContainer}>
                    <TouchableOpacity
                      style={styles.subjectHeader}
                      onPress={() => toggleSubjectExpansion(`${boardData.board}-${standardData.standard}-${subjectData.subject}`)}
                    >
                      <Text style={styles.subjectTitle}>{subjectData.subject}</Text>
                      <Icon 
                        name={expandedSubjects[`${boardData.board}-${standardData.standard}-${subjectData.subject}`] ? "expand-less" : "expand-more"} 
                        size={20} 
                        color={THEME.lighter} 
                      />
                    </TouchableOpacity>
                    
                    {expandedSubjects[`${boardData.board}-${standardData.standard}-${subjectData.subject}`] && subjectData.students.map((student, studentIndex) => (
                      <View key={studentIndex} style={styles.studentItemCompact}>
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <Text style={styles.studentEmail}>{student.email}</Text>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.infoIconContainer}
                          onPress={() => openActionModal(student)}
                        >
                          <View style={styles.infoCircle}>
                            <Icon name="info" size={16} color={THEME.text.light} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Management</Text>
        <Text style={styles.headerSubtitle}>View and manage students</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#6c757d" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, standard, subject..."
              placeholderTextColor="#adb5bd"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                <Icon name="clear" size={18} color="#6c757d" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Icon name="person-add" size={18} color={THEME.text.light} />
              <Text style={styles.buttonText}>Add Student</Text>
            </TouchableOpacity>
            
            <Text style={styles.countText}>
              {isSearching ? `${filteredStudents.length} found` : `${students.length} Students`}
            </Text>
          </View>
        </View>
        
        {renderGroupedStudents()}
      </View>
      
      {/* Add Student Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.centeredView}
        >
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Student</Text>
              <View style={styles.modalDivider} />
            </View>
            
            <ScrollView style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Student Information</Text>
              
              <Text style={styles.inputLabel}>Student Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student's full name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#aaa"
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student's email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#aaa"
              />
              
              <View style={styles.divider} />
              
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionTitle}>Subject Details</Text>
                <TouchableOpacity 
                  style={styles.addSubjectButton}
                  onPress={addSubjectForm}
                >
                  <Icon name="add-circle" size={24} color={THEME.primary} />
                </TouchableOpacity>
              </View>
              
              {subjectForms.map((form, index) => renderSubjectForm(form, index))}
              
              <Text style={styles.noteText}>
                Note: Default password will be set to '123'
              </Text>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Student</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Student Action Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={actionModalVisible}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.centeredView}
          activeOpacity={1}
          onPress={() => setActionModalVisible(false)}
        >
          <View 
            style={styles.actionModalView}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => e.stopPropagation()}
          >
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>
                {selectedStudent ? selectedStudent.name : 'Student'}
              </Text>
              <Text style={styles.actionModalSubtitle}>
                {selectedStudent ? selectedStudent.email : ''}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={openEditModal}
            >
              <Icon name="edit" size={22} color={THEME.primary} style={styles.actionIcon} />
              <Text style={styles.actionText}>Edit Student</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteStudent}
            >
              <Icon name="delete" size={22} color={THEME.danger} style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: THEME.danger }]}>Delete Student</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.centeredView}
        >
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student</Text>
              <View style={styles.modalDivider} />
            </View>
            
            <ScrollView style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Student Information</Text>
              
              <Text style={styles.inputLabel}>Student Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student's full name"
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor="#aaa"
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student's email"
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#aaa"
              />
              
              <View style={styles.divider} />
              
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionTitle}>Subject Details</Text>
                <TouchableOpacity 
                  style={styles.addSubjectButton}
                  onPress={addEditSubjectForm}
                >
                  <Icon name="add-circle" size={24} color={THEME.primary} />
                </TouchableOpacity>
              </View>
              
              {editSubjectForms.map((form, index) => renderEditSubjectForm(form, index))}
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleEditSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Add these new styles to your existing styles object
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa'
  },
  header: {
    backgroundColor: THEME.primary,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.text.light,
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#495057',
  },
  clearButton: {
    padding: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  countText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  studentEmail: {
    fontSize: 14,
    color: '#666',
  },
  infoIconContainer: {
    marginLeft: 8,
  },
  infoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: "white",
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    color: THEME.primary
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginBottom: 16
  },
  formContainer: {
    padding: 20,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.primary,
  },
  addSubjectButton: {
    padding: 5,
  },
  subjectFormContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  subjectFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectFormTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.primary,
  },
  removeSubjectButton: {
    padding: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: '#495057'
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  noteText: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 16
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: THEME.primary,
    borderLeftWidth: 0.5,
    borderLeftColor: '#e9ecef',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  // Action Modal Styles
  actionModalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '80%',
    padding: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden'
  },
  actionModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 4
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    marginRight: 15,
  },
  actionText: {
    fontSize: 16,
    color: '#495057',
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  closeButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f8f9fa'
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d'
  },
  groupedListContainer: {
    flex: 1,
  },
  boardContainer: {
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2.22,
    elevation: 2,
  },
  boardHeader: {
    backgroundColor: THEME.lightest + '20',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: THEME.primary,
  },
  boardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
  },
  standardContainer: {
    paddingLeft: 8,
  },
  standardHeader: {
    backgroundColor: THEME.lightest + '10',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: THEME.light,
  },
  standardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.light,
  },
  subjectContainer: {
    paddingLeft: 8,
  },
  subjectHeader: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 2,
    borderLeftColor: THEME.lighter,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.lighter,
  },
  studentItemCompact: {
    backgroundColor: '#fff',
    padding: 12,
    paddingLeft: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  studentEmail: {
    fontSize: 14,
    color: '#666',
  },
  infoIconContainer: {
    marginLeft: 8,
  },
  infoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
});