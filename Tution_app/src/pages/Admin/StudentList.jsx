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
        <View style={styles.subjectFormTitleContainer}>
          <Icon name="book" size={18} color={THEME.primary} style={{ marginRight: 8 }} />
          <Text style={styles.subjectFormTitle}>Subject {index + 1}</Text>
        </View>
        {index > 0 && (
          <TouchableOpacity 
            onPress={() => removeSubjectForm(index)}
            style={styles.removeSubjectButton}
          >
            <Icon name="delete" size={20} color={THEME.danger} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.formFieldContainer}>
        <Text style={styles.inputLabel}>Standard *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 11, 12"
          value={form.standard}
          onChangeText={(text) => updateSubjectForm(index, 'standard', text)}
          keyboardType="numeric"
          placeholderTextColor="#aaa"
        />
      </View>
      
      <View style={styles.formFieldContainer}>
        <Text style={styles.inputLabel}>Subject *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Math, Physics"
          value={form.subject}
          onChangeText={(text) => updateSubjectForm(index, 'subject', text)}
          placeholderTextColor="#aaa"
        />
      </View>
      
      <View style={styles.formFieldContainer}>
        <Text style={styles.inputLabel}>Board *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., CBSE, ICSE"
          value={form.board}
          onChangeText={(text) => updateSubjectForm(index, 'board', text)}
          placeholderTextColor="#aaa"
        />
      </View>
    </View>
  );

  const renderEditSubjectForm = (form, index) => (
    <View key={index} style={styles.subjectFormContainer}>
      <View style={styles.subjectFormHeader}>
        <View style={styles.subjectFormTitleContainer}>
          <Icon name="book" size={18} color={THEME.primary} style={{ marginRight: 8 }} />
          <Text style={styles.subjectFormTitle}>Subject {index + 1}</Text>
        </View>
        {index > 0 && (
          <TouchableOpacity 
            onPress={() => removeEditSubjectForm(index)}
            style={styles.removeSubjectButton}
          >
            <Icon name="delete" size={20} color={THEME.danger} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.formFieldContainer}>
        <Text style={styles.inputLabel}>Standard *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 11, 12"
          value={form.standard}
          onChangeText={(text) => updateEditSubjectForm(index, 'standard', text)}
          keyboardType="numeric"
          placeholderTextColor="#aaa"
        />
      </View>
      
      <View style={styles.formFieldContainer}>
        <Text style={styles.inputLabel}>Subject *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Math, Physics"
          value={form.subject}
          onChangeText={(text) => updateEditSubjectForm(index, 'subject', text)}
          placeholderTextColor="#aaa"
        />
      </View>
      
      <View style={styles.formFieldContainer}>
        <Text style={styles.inputLabel}>Board *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., CBSE, ICSE"
          value={form.board}
          onChangeText={(text) => updateEditSubjectForm(index, 'board', text)}
          placeholderTextColor="#aaa"
        />
      </View>
    </View>
  );

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Generate a variant of the theme color based on the board name
  const getBoardColor = (boardName) => {
    if (!boardName) return THEME.primary;
    
    const nameHash = boardName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const variants = [
      THEME.primary,
      THEME.light,
      THEME.lighter,
      THEME.lightest,
      THEME.dark,
    ];
    
    return variants[nameHash % variants.length];
  };

  // Render board section with elegant cards
  const renderBoardSection = (boardData, boardIndex) => {
    const boardColor = getBoardColor(boardData.board);
    const totalStudents = boardData.standards.reduce(
      (total, std) => total + std.subjects.reduce((stdTotal, subj) => stdTotal + subj.students.length, 0), 
      0
    );
    const totalStandards = boardData.standards.length;
    const isExpanded = expandedBoards[boardData.board];
    
    return (
      <View key={`board-${boardIndex}`} style={styles.boardContainer}>
        <View style={[styles.boardCard, { borderTopColor: boardColor }]}>
          <TouchableOpacity
            style={styles.boardHeaderContent}
            onPress={() => toggleBoardExpansion(boardData.board)}
            activeOpacity={0.7}
          >
            <View style={styles.boardTitleRow}>
              <View style={[styles.boardIconCircle, { backgroundColor: boardColor + '20' }]}>
                <Icon name="account-balance" size={22} color={boardColor} />
              </View>
              <View style={styles.boardTextContainer}>
                <Text style={[styles.boardTitle, { color: boardColor }]}>{boardData.board}</Text>
                <Text style={styles.boardSubtitle}>
                  {totalStudents} {totalStudents === 1 ? 'student' : 'students'} • {totalStandards} {totalStandards === 1 ? 'standard' : 'standards'}
                </Text>
              </View>
              <Icon 
                name={isExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color={boardColor} 
              />
            </View>
          </TouchableOpacity>
          
          {isExpanded && (
            <View style={styles.standardsContainer}>
              {boardData.standards.map((standardData, stdIndex) => 
                renderStandardSection(standardData, boardColor, boardData.board, stdIndex)
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render standard section
  const renderStandardSection = (standardData, boardColor, boardName, stdIndex) => {
    const standardColor = boardColor === THEME.primary ? THEME.light : 
                         boardColor === THEME.light ? THEME.lighter : 
                         boardColor === THEME.lighter ? THEME.lightest :
                         THEME.primary;
    const standardKey = `${boardName}-${standardData.standard}`;
    const isExpanded = expandedStandards[standardKey];
    const totalStudents = standardData.subjects.reduce((total, subj) => total + subj.students.length, 0);
    
    return (
      <View key={`std-${stdIndex}`} style={styles.standardContainer}>
        <View style={styles.standardCard}>
          <TouchableOpacity
            style={styles.standardHeaderRow}
            onPress={() => toggleStandardExpansion(standardKey)}
            activeOpacity={0.7}
          >
            <View style={[styles.standardIconCircle, { backgroundColor: standardColor + '20' }]}>
              <Icon name="class" size={18} color={standardColor} />
            </View>
            <Text style={[styles.standardTitle, { color: standardColor }]}>
              Standard {standardData.standard}
            </Text>
            <Text style={styles.standardSubjectCount}>
              {totalStudents} {totalStudents === 1 ? 'student' : 'students'}
            </Text>
            <Icon 
              name={isExpanded ? "expand-less" : "expand-more"} 
              size={20} 
              color={standardColor}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
          
          {isExpanded && (
            <View style={styles.subjectsGrid}>
              {standardData.subjects.map((subjectData, subIndex) => 
                renderSubjectSection(subjectData, standardColor, boardName, standardData.standard, subIndex)
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render subject section
  const renderSubjectSection = (subjectData, standardColor, boardName, standard, subIndex) => {
    const subjectColor = standardColor === THEME.light ? THEME.lighter : 
                       standardColor === THEME.lighter ? THEME.lightest :
                       standardColor === THEME.lightest ? THEME.primary :
                       THEME.light;
    const subjectKey = `${boardName}-${standard}-${subjectData.subject}`;
    const isExpanded = expandedSubjects[subjectKey];
    const studentCount = subjectData.students.length;
    
    return (
      <View key={`subj-${subIndex}`} style={styles.subjectContainer}>
        <TouchableOpacity 
          style={styles.subjectChip}
          onPress={() => toggleSubjectExpansion(subjectKey)}
          activeOpacity={0.7}
        >
          <View style={[styles.subjectIconDot, { backgroundColor: subjectColor }]} />
          <Text style={styles.subjectChipText} numberOfLines={1}>
            {subjectData.subject}
          </Text>
          <View style={styles.studentCountBadge}>
            <Text style={styles.studentCountText}>
              {studentCount} {studentCount === 1 ? 'student' : 'students'}
            </Text>
          </View>
          <Icon 
            name={isExpanded ? "expand-less" : "expand-more"} 
            size={16} 
            color="#999"
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.studentsListContainer}>
            {subjectData.students.map((student, studentIndex) => (
              <View key={`student-${studentIndex}`} style={styles.studentItemCard}>
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
        )}
      </View>
    );
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
      {/* Elegant Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Student Management</Text>
            <Text style={styles.headerSubtitle}>View and manage students across all subjects</Text>
          </View>
          <TouchableOpacity 
            style={styles.headerAddButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="person-add" size={28} color={THEME.text.light} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subject List */}
      <ScrollView 
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={fetchStudents}
      >
        {/* Quick Stats Dashboard in Single Line */}
        <View style={styles.statsDashboard}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCard1]}>
              <Icon name="school" size={20} color={THEME.primary} />
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>{students.length}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
            </View>
            
            <View style={[styles.statCard, styles.statCard2]}>
              <Icon name="class" size={20} color={THEME.light} />
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>
                  {[...new Set(students.flatMap(s => s.subjects?.map(subj => subj.standard) || []))].length}
                </Text>
                <Text style={styles.statLabel}>Standards</Text>
              </View>
            </View>
            
            <View style={[styles.statCard, styles.statCard3]}>
              <Icon name="account-balance" size={20} color={THEME.lighter} />
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>
                  {[...new Set(students.flatMap(s => s.subjects?.map(subj => subj.board) || []))].length}
                </Text>
                <Text style={styles.statLabel}>Boards</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, subject..."
            placeholderTextColor="#adb5bd"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Icon name="clear" size={18} color="#7f8c8d" />
            </TouchableOpacity>
          )}
        </View>

        {groupedData.length > 0 ? (
          <View style={styles.subjectsWrapper}>
            <View style={styles.sectionHeaderContainer}>
              <Icon name="folder-open" size={20} color={THEME.primary} />
              <Text style={styles.sectionHeaderText}>All Students</Text>
              <View style={styles.sectionHeaderLine} />
            </View>
            {groupedData.map((boardData, boardIndex) => renderBoardSection(boardData, boardIndex))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name={isSearching ? "search-off" : "school"} size={60} color={THEME.lightest} />
            </View>
            <Text style={styles.emptyTitle}>
              {isSearching ? "No matching students" : "No Students Yet"}
            </Text>
            <Text style={styles.emptyText}>
              {isSearching 
                ? "Try a different search term" 
                : "Start by adding your first student to get organized"
              }
            </Text>
            {!isSearching && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => setModalVisible(true)}
              >
                <Icon name="person-add" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.emptyButtonText}>Add Your First Student</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Add Student Modal - Full Screen */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenModalHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="arrow-back" size={24} color={THEME.text.light} />
            </TouchableOpacity>
            <View>
              <Text style={styles.fullScreenModalTitle}>Add New Student</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
          
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          >
            <ScrollView 
              style={styles.fullScreenScrollView} 
              contentContainerStyle={styles.fullScreenScrollViewContent}
            >
              <View style={styles.fullScreenFormSection}>
                <Text style={styles.fullScreenSectionTitle}>Student Information</Text>
                
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
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.fullScreenFormSection}>
                <View style={styles.sectionHeaderContainer}>
                  <Text style={styles.fullScreenSectionTitle}>Subject Details</Text>
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
              </View>
              
              {/* Extra padding to ensure content isn't hidden behind the fixed bottom bar */}
              <View style={{ height: 80 }} />
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={styles.fixedBottomBar}>
            <TouchableOpacity
              style={styles.fixedCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.fixedSubmitButton}
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

      {/* Edit Student Modal - Full Screen */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenModalHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Icon name="arrow-back" size={24} color={THEME.text.light} />
            </TouchableOpacity>
            <View>
              <Text style={styles.fullScreenModalTitle}>Edit Student</Text>
              <Text style={styles.fullScreenModalSubtitle}>
                {editName}
              </Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
          
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          >
            <ScrollView 
              style={styles.fullScreenScrollView} 
              contentContainerStyle={styles.fullScreenScrollViewContent}
            >
              <View style={styles.fullScreenFormSection}>
                <Text style={styles.fullScreenSectionTitle}>Student Information</Text>
                
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
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.fullScreenFormSection}>
                <View style={styles.sectionHeaderContainer}>
                  <Text style={styles.fullScreenSectionTitle}>Subject Details</Text>
                  <TouchableOpacity 
                    style={styles.addSubjectButton}
                    onPress={addEditSubjectForm}
                  >
                    <Icon name="add-circle" size={24} color={THEME.primary} />
                  </TouchableOpacity>
                </View>
                
                {editSubjectForms.map((form, index) => renderEditSubjectForm(form, index))}
              </View>
              
              {/* Extra padding to ensure content isn't hidden behind the fixed bottom bar */}
              <View style={{ height: 80 }} />
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={styles.fixedBottomBar}>
            <TouchableOpacity
              style={styles.fixedCancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.fixedSubmitButton}
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
      </Modal>
    </View>
  );
}

// Add these new styles to your existing styles object
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f7fa'
  },
  header: {
    backgroundColor: THEME.primary,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: THEME.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.text.light,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
  },
  headerAddButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Stats Dashboard
  statsDashboard: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statCard1: {
    borderLeftWidth: 3,
    borderLeftColor: THEME.primary,
  },
  statCard2: {
    borderLeftWidth: 3,
    borderLeftColor: THEME.light,
  },
  statCard3: {
    borderLeftWidth: 3,
    borderLeftColor: THEME.lighter,
  },
  statTextContainer: {
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2d3436',
    lineHeight: 20,
  },
  statLabel: {
    fontSize: 10,
    color: '#636e72',
    fontWeight: '600',
  },
  // List Container
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2d3436',
  },
  clearButton: {
    padding: 8,
  },
  subjectsWrapper: {
    marginTop: 10,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
    marginLeft: 8,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 2,
    backgroundColor: THEME.lightest + '40',
    marginLeft: 12,
    borderRadius: 1,
  },
  // Board Card
  boardContainer: {
    marginBottom: 20,
  },
  boardCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    borderTopWidth: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  boardHeaderContent: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  boardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  boardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  boardTextContainer: {
    flex: 1,
  },
  boardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  boardSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  standardsContainer: {
    marginTop: 8,
  },
  // Standard Card
  standardContainer: {
    marginBottom: 16,
  },
  standardCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 16,
  },
  standardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  standardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  standardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  standardSubjectCount: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  // Subjects Grid
  subjectsGrid: {
    marginTop: 4,
  },
  subjectContainer: {
    marginBottom: 8,
  },
  subjectChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  subjectIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3436',
    marginRight: 6,
    flex: 1,
  },
  studentCountBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  studentCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  // Students List
  studentsListContainer: {
    marginTop: 8,
    marginLeft: 12,
  },
  studentItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: THEME.lightest,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    color: '#2d3436',
  },
  studentEmail: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  infoIconContainer: {
    marginLeft: 8,
  },
  infoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: THEME.lightest + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#636e72',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  emptyButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  // Full screen modal styles
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  fullScreenModalHeader: {
    backgroundColor: THEME.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: THEME.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  headerSpacer: {
    width: 40,
  },
  fullScreenModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text.light,
    textAlign: 'center',
  },
  fullScreenModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 2,
  },
  fullScreenScrollView: {
    flex: 1,
  },
  fullScreenScrollViewContent: {
    padding: 20,
  },
  fullScreenFormSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  fullScreenSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addSubjectButton: {
    padding: 5,
  },
  subjectFormContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  subjectFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  subjectFormTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
  },
  removeSubjectButton: {
    padding: 5,
  },
  formFieldContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    color: THEME.text.dark,
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    color: '#2d3436',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 0,
  },
  noteText: {
    fontSize: 13,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#ffffff',
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fixedCancelButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  fixedSubmitButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: THEME.primary,
    borderLeftWidth: 0.5,
    borderLeftColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#636e72',
    fontWeight: '700',
    fontSize: 16,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  // Action Modal
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  actionModalView: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '85%',
    padding: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  actionModalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  actionModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: '#636e72',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    color: '#2d3436',
    fontWeight: '600',
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  closeButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#636e72',
  },
});