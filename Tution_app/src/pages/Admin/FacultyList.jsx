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
  FlatList
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
  danger: '#DC2626',
  success: '#10B981'
};

export default function FacultyList() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [studentMapModalVisible, setStudentMapModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  
  // For filtering faculty
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFaculties, setFilteredFaculties] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // For mapping students to faculty
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [mappedStudents, setMappedStudents] = useState([]);
  
  // For adding faculty with multiple subjects
  const [subjectForms, setSubjectForms] = useState([
    { standard: '', subject: '', board: '' }
  ]);
  
  // For editing faculty with multiple subjects
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSubjectForms, setEditSubjectForms] = useState([]);

  useEffect(() => {
    fetchFaculties();
  }, []);
  
  // Apply filter whenever searchQuery or faculties list changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFaculties(faculties);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      const lowercasedQuery = searchQuery.toLowerCase();
      
      const filtered = faculties.filter(faculty => {
        // Check faculty name and email
        const nameMatch = faculty.name.toLowerCase().includes(lowercasedQuery);
        const emailMatch = faculty.email.toLowerCase().includes(lowercasedQuery);
        
        // Check if any subject matches the query
        const subjectMatch = faculty.subjects && faculty.subjects.some(subj => 
          subj.subjectname.toLowerCase().includes(lowercasedQuery) || 
          subj.board.toLowerCase().includes(lowercasedQuery) ||
          subj.standard.toString().includes(lowercasedQuery)
        );
        
        // Check if any student name matches
        const studentMatch = faculty.students && faculty.students.some(student =>
          student.name.toLowerCase().includes(lowercasedQuery)
        );
        
        return nameMatch || emailMatch || subjectMatch || studentMatch;
      });
      
      setFilteredFaculties(filtered);
    }
  }, [searchQuery, faculties]);
  
  // Filter students based on search query
  useEffect(() => {
    if (searchStudentQuery.trim() === '') {
      setFilteredStudents([]);
    } else {
      const lowercasedQuery = searchStudentQuery.toLowerCase();
      const filtered = allStudents.filter(student => 
        student.name.toLowerCase().includes(lowercasedQuery) ||
        student.email.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredStudents(filtered);
    }
  }, [searchStudentQuery, allStudents]);

  const fetchFaculties = async () => {
    try {
      setRefreshing(true);
      console.log('🔍 Fetching faculties from:', `${API_URL}/admin/facultiesWithSubjects`);
      
      const response = await fetch(`${API_URL}/admin/facultiesWithSubjects`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Fetch response:', data);
      
      if (data.success) {
        setFaculties(data.data || []);
        setFilteredFaculties(data.data || []); // Initialize filtered list with all faculties
        console.log(`👨‍🏫 Loaded ${data.data?.length || 0} faculties`);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch faculties');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      Alert.alert('Error', `Could not load faculties: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Fetch all students for mapping
  const fetchAllStudents = async () => {
    try {
      setStudentSearchLoading(true);
      console.log('🔍 Fetching all students');
      
      const response = await fetch(`${API_URL}/admin/students`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAllStudents(data.data || []);
        console.log(`👨‍🎓 Loaded ${data.data?.length || 0} students for mapping`);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('❌ Student fetch error:', error);
      Alert.alert('Error', `Could not load students: ${error.message}`);
    } finally {
      setStudentSearchLoading(false);
    }
  };
  
  // Fetch mapped students for a faculty
  const fetchMappedStudents = async (facultyId) => {
    try {
      setLoading(true);
      console.log(`🔍 Fetching students mapped to faculty ${facultyId}`);
      
      const response = await fetch(`${API_URL}/admin/facultyStudentMappings/${facultyId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMappedStudents(data.data || []);
        console.log(`👨‍🎓 Loaded ${data.data?.length || 0} mapped students`);
      } else {
        setMappedStudents([]);
        console.log('No students mapped to this faculty');
      }
    } catch (error) {
      console.error('❌ Mapped students fetch error:', error);
      setMappedStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Open student mapping modal
  const openStudentMapModal = (faculty) => {
    setSelectedFaculty(faculty);
    setSelectedStudents([]);
    setSearchStudentQuery('');
    fetchAllStudents();
    fetchMappedStudents(faculty.id);
    setStudentMapModalVisible(true);
  };

  // Toggle student selection for mapping
  const toggleStudentSelection = (student) => {
    const isAlreadySelected = selectedStudents.some(s => s.id === student.id);
    
    if (isAlreadySelected) {
      setSelectedStudents(selectedStudents.filter(s => s.id !== student.id));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  // Check if a student is already mapped to the faculty
  const isStudentAlreadyMapped = (studentId) => {
    return mappedStudents.some(s => s.id === studentId);
  };

  // Clear search query for faculty filter
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Map selected students to faculty
  const mapStudentsToFaculty = async () => {
    if (selectedStudents.length === 0) {
      Alert.alert('Error', 'Please select at least one student to map');
      return;
    }
    
    try {
      setLoading(true);
      console.log(`📝 Mapping ${selectedStudents.length} students to faculty ${selectedFaculty.id}`);
      
      const mappingData = {
        facultyId: selectedFaculty.id,
        studentIds: selectedStudents.map(s => s.id)
      };
      
      const response = await fetch(`${API_URL}/admin/mapStudentsToFaculty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappingData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', `Successfully mapped ${selectedStudents.length} students to ${selectedFaculty.name}`);
        setStudentMapModalVisible(false);
        fetchFaculties();
      } else {
        Alert.alert('Error', data.message || 'Failed to map students to faculty');
      }
    } catch (error) {
      console.error('❌ Student mapping error:', error);
      Alert.alert('Error', `Could not map students: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Remove a mapped student from faculty
  const removeStudentMapping = async (studentId) => {
    try {
      setLoading(true);
      console.log(`🗑️ Removing student ${studentId} mapping from faculty ${selectedFaculty.id}`);
      
      const response = await fetch(`${API_URL}/admin/removeFacultyStudentMapping`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facultyId: selectedFaculty.id,
          studentId: studentId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMappedStudents(mappedStudents.filter(s => s.id !== studentId));
        Alert.alert('Success', 'Student mapping removed successfully');
      } else {
        Alert.alert('Error', data.message || 'Failed to remove student mapping');
      }
    } catch (error) {
      console.error('❌ Remove mapping error:', error);
      Alert.alert('Error', `Could not remove mapping: ${error.message}`);
    } finally {
      setLoading(false);
    }
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

  // Open action modal when info icon is clicked
  const openActionModal = (faculty) => {
    setSelectedFaculty(faculty);
    setActionModalVisible(true);
  };

  // Open edit modal with faculty data
  const openEditModal = () => {
    if (selectedFaculty) {
      setEditId(selectedFaculty.id);
      setEditName(selectedFaculty.name);
      setEditEmail(selectedFaculty.email);
      
      if (selectedFaculty.subjects && selectedFaculty.subjects.length > 0) {
        // Map all subject data to edit forms
        const subjectForms = selectedFaculty.subjects.map(subj => ({
          id: subj.id,
          standard: subj.standard.toString(),
          subject: subj.subjectname,
          board: subj.board
        }));
        setEditSubjectForms(subjectForms);
      } else {
        // Initialize with empty form if no subjects
        setEditSubjectForms([{ standard: '', subject: '', board: '', id: null }]);
      }
      
      setActionModalVisible(false);
      setEditModalVisible(true);
    }
  };

  // Handle delete faculty
  const handleDeleteFaculty = async () => {
    try {
      setLoading(true);
      console.log('🗑️ Deleting faculty:', selectedFaculty.id);
      
      const response = await fetch(`${API_URL}/admin/deleteFaculty/${selectedFaculty.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('✅ Delete faculty response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Faculty deleted successfully');
        setActionModalVisible(false);
        fetchFaculties(); // Refresh the list
      } else {
        Alert.alert('Error', data.message || 'Failed to delete faculty');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      Alert.alert('Error', `Could not delete faculty: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!name.trim()) {
      Alert.alert('Error', 'Faculty name is required');
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
      console.log('📤 Registering faculty with subjects');
      
      const facultyData = {
        name: name.trim(),
        email: email.trim(),
        subjects: subjectForms
      };
      
      const response = await fetch(`${API_URL}/admin/registerFacultyWithSubjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(facultyData)
      });
      
      const data = await response.json();
      console.log('✅ Register faculty response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Faculty added successfully');
        setName('');
        setEmail('');
        setSubjectForms([{ standard: '', subject: '', board: '' }]);
        setModalVisible(false);
        fetchFaculties(); // Refresh the list
      } else {
        Alert.alert('Error', data.message || 'Failed to add faculty');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Error', `Could not add faculty: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit faculty submission
  const handleEditSubmit = async () => {
    // Validate inputs
    if (!editName.trim()) {
      Alert.alert('Error', 'Faculty name is required');
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
      console.log('📝 Updating faculty:', editId);
      
      // Format the subject data for backend
      const subjectsToSubmit = editSubjectForms.map(form => ({
        standard: form.standard,
        subject: form.subject,
        board: form.board,
        id: form.id
      }));
      
      const facultyData = {
        id: editId,
        name: editName.trim(),
        email: editEmail.trim(),
        subjects: subjectsToSubmit
      };
      
      console.log('Faculty data to submit:', facultyData);
      
      const response = await fetch(`${API_URL}/admin/updateFacultyWithSubjects/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(facultyData)
      });
      
      const data = await response.json();
      console.log('✅ Update faculty response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Faculty updated successfully');
        setEditModalVisible(false);
        fetchFaculties(); // Refresh the list
      } else {
        Alert.alert('Error', data.message || 'Failed to update faculty');
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      Alert.alert('Error', `Could not update faculty: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const renderFacultyItem = ({ item }) => (
    <View style={styles.facultyItem}>
      <View style={styles.facultyInfo}>
        <View style={styles.facultyHeader}>
          <Text style={styles.facultyName}>{item.name}</Text>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.studentMapButton}
              onPress={() => openStudentMapModal(item)}
            >
              <Icon name="person-add" size={18} color={THEME.success} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.infoIconContainer}
              onPress={() => openActionModal(item)}
            >
              <View style={styles.infoCircle}>
                <Icon name="info" size={16} color={THEME.text.light} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.facultyEmail}>{item.email}</Text>
        
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
        
        {item.students && item.students.length > 0 && (
          <View style={styles.studentSection}>
            <Text style={styles.studentSectionTitle}>Students ({item.students.length})</Text>
            <View style={styles.studentsContainer}>
              {item.students.slice(0, 3).map((student, index) => (
                <View key={index} style={styles.studentChip}>
                  <Text style={styles.studentText}>{student.name}</Text>
                </View>
              ))}
              {item.students.length > 3 && (
                <TouchableOpacity 
                  style={styles.moreStudentsChip}
                  onPress={() => openStudentMapModal(item)}
                >
                  <Text style={styles.moreStudentsText}>+{item.students.length - 3} more</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderStudentItem = ({ item }) => {
    const isAlreadyMapped = isStudentAlreadyMapped(item.id);
    const isSelected = selectedStudents.some(s => s.id === item.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.studentSearchItem,
          isAlreadyMapped && styles.disabledStudentItem,
          isSelected && styles.selectedStudentItem
        ]}
        onPress={() => !isAlreadyMapped && toggleStudentSelection(item)}
        disabled={isAlreadyMapped}
      >
        <View style={styles.studentSearchInfo}>
          <Text style={styles.studentSearchName}>{item.name}</Text>
          <Text style={styles.studentSearchEmail}>{item.email}</Text>
          
          {item.board && item.standard && (
            <View style={styles.studentDetailsRow}>
              <View style={styles.studentDetailsChip}>
                <Text style={styles.studentDetailsText}>
                  {item.board} • Class {item.standard}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {isAlreadyMapped ? (
          <View style={styles.alreadyMappedIndicator}>
            <Text style={styles.alreadyMappedText}>Already mapped</Text>
          </View>
        ) : (
          <View style={[styles.checkCircle, isSelected && styles.checkedCircle]}>
            {isSelected && <Icon name="check" size={16} color="#fff" />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMappedStudentItem = ({ item }) => (
    <View style={styles.mappedStudentItem}>
      <View style={styles.mappedStudentInfo}>
        <Text style={styles.mappedStudentName}>{item.name}</Text>
        <Text style={styles.mappedStudentEmail}>{item.email}</Text>
        
        {item.board && item.standard && (
          <View style={styles.studentDetailsChip}>
            <Text style={styles.studentDetailsText}>
              {item.board} • Class {item.standard}
            </Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.removeMappingButton}
        onPress={() => removeStudentMapping(item.id)}
      >
        <Icon name="remove-circle" size={20} color={THEME.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Elegant Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Faculty Management</Text>
            <Text style={styles.headerSubtitle}>View and manage faculty members</Text>
          </View>
          <TouchableOpacity 
            style={styles.headerAddButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="person-add" size={28} color={THEME.text.light} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Faculty List */}
      <ScrollView 
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={fetchFaculties}
      >
        {/* Quick Stats Dashboard */}
        <View style={styles.statsDashboard}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCard1]}>
              <Icon name="school" size={20} color={THEME.primary} />
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>{faculties.length}</Text>
                <Text style={styles.statLabel}>Faculty</Text>
              </View>
            </View>
            
            <View style={[styles.statCard, styles.statCard2]}>
              <Icon name="book" size={20} color={THEME.light} />
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>
                  {faculties.reduce((sum, f) => sum + (f.subjects?.length || 0), 0)}
                </Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
            </View>
            
            <View style={[styles.statCard, styles.statCard3]}>
              <Icon name="groups" size={20} color={THEME.lighter} />
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>
                  {faculties.reduce((sum, f) => sum + (f.students?.length || 0), 0)}
                </Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, subject, student..."
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

        {/* Faculty Cards */}
        {filteredFaculties.length > 0 ? (
          <View style={styles.facultyWrapper}>
            <View style={styles.sectionHeaderContainer}>
              <Icon name="people" size={20} color={THEME.primary} />
              <Text style={styles.sectionHeaderText}>All Faculty Members</Text>
              <View style={styles.sectionHeaderLine} />
            </View>
            
            {filteredFaculties.map((faculty) => (
              <View key={faculty.id} style={styles.facultyCard}>
                <View style={styles.facultyCardHeader}>
                  <View style={styles.facultyMainInfo}>
                    <View style={styles.facultyIconCircle}>
                      <Icon name="person" size={24} color={THEME.primary} />
                    </View>
                    <View style={styles.facultyDetails}>
                      <Text style={styles.facultyName}>{faculty.name}</Text>
                      <Text style={styles.facultyEmail}>{faculty.email}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.facultyActions}>
                    <TouchableOpacity
                      style={styles.actionIconButton}
                      onPress={() => openStudentMapModal(faculty)}
                    >
                      <Icon name="person-add" size={20} color={THEME.success} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionIconButton}
                      onPress={() => openActionModal(faculty)}
                    >
                      <Icon name="more-vert" size={20} color={THEME.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Subjects Section */}
                {faculty.subjects && faculty.subjects.length > 0 ? (
                  <View style={styles.facultySubjectsSection}>
                    <View style={styles.sectionTitleRow}>
                      <Icon name="book" size={16} color={THEME.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.subjectsSectionTitle}>
                        Subjects ({faculty.subjects.length})
                      </Text>
                    </View>
                    <View style={styles.subjectsChipContainer}>
                      {faculty.subjects.map((subj, index) => (
                        <View key={index} style={styles.modernSubjectChip}>
                          <View style={styles.chipDot} />
                          <Text style={styles.modernSubjectText}>
                            {subj.subjectname}
                          </Text>
                          <View style={styles.chipDivider} />
                          <Text style={styles.chipMetaText}>
                            {subj.board} • Std {subj.standard}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.noDataSection}>
                    <Icon name="book-outline" size={16} color="#adb5bd" />
                    <Text style={styles.noDataText}>No subjects assigned yet</Text>
                  </View>
                )}
                
                {/* Students Section */}
                {faculty.students && faculty.students.length > 0 && (
                  <View style={styles.facultyStudentsSection}>
                    <View style={styles.sectionTitleRow}>
                      <Icon name="groups" size={16} color={THEME.success} style={{ marginRight: 6 }} />
                      <Text style={styles.studentsSectionTitle}>
                        Mapped Students ({faculty.students.length})
                      </Text>
                    </View>
                    <View style={styles.studentsChipContainer}>
                      {faculty.students.slice(0, 3).map((student, index) => (
                        <View key={index} style={styles.modernStudentChip}>
                          <Icon name="person" size={12} color={THEME.success} style={{ marginRight: 4 }} />
                          <Text style={styles.modernStudentText}>{student.name}</Text>
                        </View>
                      ))}
                      {faculty.students.length > 3 && (
                        <TouchableOpacity 
                          style={styles.moreChip}
                          onPress={() => openStudentMapModal(faculty)}
                        >
                          <Text style={styles.moreChipText}>+{faculty.students.length - 3} more</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name={isSearching ? "search-off" : "school"} size={60} color={THEME.lightest} />
            </View>
            <Text style={styles.emptyTitle}>
              {isSearching ? "No matching faculty found" : "No Faculty Members Yet"}
            </Text>
            <Text style={styles.emptyText}>
              {isSearching 
                ? "Try a different search term" 
                : "Start by adding your first faculty member to get started"
              }
            </Text>
            {!isSearching && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => setModalVisible(true)}
              >
                <Icon name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.emptyButtonText}>Add First Faculty</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Add Faculty Modal - Full Screen */}
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
              <Text style={styles.fullScreenModalTitle}>Add New Faculty</Text>
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
                <Text style={styles.fullScreenSectionTitle}>Faculty Information</Text>
                
                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Faculty Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter faculty's full name"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#aaa"
                  />
                </View>

                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter faculty's email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#aaa"
                  />
                </View>
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
                <Text style={styles.submitButtonText}>Add Faculty</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Faculty Action Modal */}
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
                {selectedFaculty ? selectedFaculty.name : 'Faculty'}
              </Text>
              <Text style={styles.actionModalSubtitle}>
                {selectedFaculty ? selectedFaculty.email : ''}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setActionModalVisible(false);
                openStudentMapModal(selectedFaculty);
              }}
            >
              <Icon name="person-add" size={22} color={THEME.success} style={styles.actionIcon} />
              <Text style={styles.actionText}>Map Students</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={openEditModal}
            >
              <Icon name="edit" size={22} color={THEME.primary} style={styles.actionIcon} />
              <Text style={styles.actionText}>Edit Faculty</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteFaculty}
            >
              <Icon name="delete" size={22} color={THEME.danger} style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: THEME.danger }]}>Delete Faculty</Text>
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

      {/* Edit Faculty Modal - Full Screen */}
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
              <Text style={styles.fullScreenModalTitle}>Edit Faculty</Text>
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
                <Text style={styles.fullScreenSectionTitle}>Faculty Information</Text>
                
                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Faculty Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter faculty's full name"
                    value={editName}
                    onChangeText={setEditName}
                    placeholderTextColor="#aaa"
                  />
                </View>

                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter faculty's email"
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#aaa"
                  />
                </View>
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

      {/* Student Mapping Modal - Full Screen */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={studentMapModalVisible}
        onRequestClose={() => setStudentMapModalVisible(false)}
      >
        <View style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenModalHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setStudentMapModalVisible(false)}
            >
              <Icon name="arrow-back" size={24} color={THEME.text.light} />
            </TouchableOpacity>
            <View>
              <Text style={styles.fullScreenModalTitle}>Map Students to Faculty</Text>
              <Text style={styles.fullScreenModalSubtitle}>
                {selectedFaculty ? selectedFaculty.name : ''}
              </Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.studentSearchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="search" size={20} color="#6c757d" style={styles.searchIcon} />
              <TextInput
                style={styles.studentSearchInput}
                placeholder="Search students by name or email..."
                placeholderTextColor="#adb5bd"
                value={searchStudentQuery}
                onChangeText={setSearchStudentQuery}
                autoCapitalize="none"
              />
              {searchStudentQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchStudentQuery('')} 
                  style={styles.clearButton}
                >
                  <Icon name="clear" size={18} color="#6c757d" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <ScrollView 
            style={styles.fullScreenScrollView} 
            contentContainerStyle={styles.fullScreenScrollViewContent}
          >
            <View style={styles.sectionContainer}>
              <Text style={styles.mappingSectionTitle}>
                Currently Mapped Students 
                {mappedStudents.length > 0 ? ` (${mappedStudents.length})` : ''}
              </Text>
              
              {loading ? (
                <ActivityIndicator size="small" color={THEME.primary} style={styles.loadingIndicator} />
              ) : mappedStudents.length > 0 ? (
                <FlatList
                  data={mappedStudents}
                  renderItem={renderMappedStudentItem}
                  keyExtractor={item => item.id.toString()}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                />
              ) : (
                <Text style={styles.noMappingsText}>No students mapped to this faculty yet.</Text>
              )}
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.sectionContainer}>
              <Text style={styles.mappingSectionTitle}>Select Students to Map</Text>
              <Text style={styles.mappingSectionSubtitle}>
                Select students from the list below to map them to this faculty.
              </Text>
              
              {studentSearchLoading ? (
                <ActivityIndicator size="small" color={THEME.primary} style={styles.loadingIndicator} />
              ) : searchStudentQuery.trim() === '' ? (
                <Text style={styles.searchPromptText}>Start typing to search for students...</Text>
              ) : filteredStudents.length > 0 ? (
                <FlatList
                  data={filteredStudents}
                  renderItem={renderStudentItem}
                  keyExtractor={item => item.id.toString()}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                />
              ) : (
                <Text style={styles.noResultsText}>No students found matching your search.</Text>
              )}
            </View>
            
            {selectedStudents.length > 0 && (
              <View style={styles.selectedCountContainer}>
                <Text style={styles.selectedCountText}>
                  {selectedStudents.length} {selectedStudents.length === 1 ? 'student' : 'students'} selected
                </Text>
              </View>
            )}
            
            {/* Extra padding to ensure content isn't hidden behind the fixed bottom bar */}
            <View style={{ height: 80 }} />
          </ScrollView>

          <View style={styles.fixedBottomBar}>
            <TouchableOpacity
              style={styles.fixedCancelButton}
              onPress={() => setStudentMapModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.fixedSubmitButton,
                selectedStudents.length === 0 && styles.disabledButton
              ]}
              onPress={mapStudentsToFaculty}
              disabled={selectedStudents.length === 0 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Map Selected Students</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa'
  },
  header: {
    backgroundColor: THEME.primary,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerAddButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAddButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.text.light,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
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
  // Search Container (for main faculty list)
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
  // Faculty Wrapper
  facultyWrapper: {
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
    flex: 1,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 2,
    backgroundColor: THEME.lightest + '30',
    marginLeft: 10,
  },
  // Faculty Card
  facultyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  facultyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  facultyMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  facultyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.lightest + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  facultyDetails: {
    flex: 1,
  },
  facultyName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 4,
  },
  facultyEmail: {
    fontSize: 14,
    color: '#636e72',
  },
  facultyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Subjects Section
  facultySubjectsSection: {
    padding: 16,
    backgroundColor: '#fafbfc',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f1f3',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  subjectsChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modernSubjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.lightest + '40',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
    marginRight: 8,
  },
  modernSubjectText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },
  chipDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e9ecef',
    marginHorizontal: 8,
  },
  chipMetaText: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  noDataSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  noDataText: {
    fontSize: 13,
    color: '#adb5bd',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  // Students Section
  facultyStudentsSection: {
    padding: 16,
  },
  studentsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.success,
  },
  studentsChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modernStudentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.success + '10',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.success + '30',
  },
  modernStudentText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.success,
  },
  moreChip: {
    backgroundColor: '#e9ecef',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  moreChipText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#636e72',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: THEME.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Full screen modal styles
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  fullScreenModalHeader: {
    backgroundColor: THEME.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerSpacer: {
    width: 40, // Balance the header layout
  },
  fullScreenModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text.light,
    textAlign: 'center',
  },
  fullScreenModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  fullScreenScrollView: {
    flex: 1,
  },
  fullScreenScrollViewContent: {
    padding: 20,
  },
  fullScreenFormSection: {
    marginBottom: 16,
  },
  fullScreenSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 16,
  },
  formFieldContainer: {
    marginBottom: 12,
  },
  subjectFormTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    elevation: 8,
  },
  fixedCancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  fixedSubmitButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: THEME.primary,
    borderLeftWidth: 0.5,
    borderLeftColor: '#e9ecef',
  },
  // Modal Styles
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
    marginBottom: 6,
    textAlign: "center",
    color: THEME.primary
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
    color: '#6c757d'
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginBottom: 16
  },
  formContainer: {
    padding: 20,
  },
  mappingFormContainer: {
    flex: 1,
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
    marginBottom: 12,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  mappingSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.primary,
    marginBottom: 8,
  },
  mappingSectionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 1,
  },
  subjectFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  subjectFormTitle: {
    fontSize: 16,
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
    color: '#495057',
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
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
  disabledButton: {
    backgroundColor: '#adb5bd',
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
  // Student mapping modal styles
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: THEME.primary + '10',
  },
  tabText: {
    color: THEME.primary,
    fontWeight: '600',
  },
  // Student Mapping Search (in modal)
  studentSearchContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 10,
  },
  studentSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#495057',
  },
  studentSearchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedStudentItem: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary + '10',
  },
  disabledStudentItem: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    opacity: 0.7,
  },
  studentSearchInfo: {
    flex: 1,
  },
  studentSearchName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  studentSearchEmail: {
    fontSize: 13,
    color: '#6c757d',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#adb5bd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCircle: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  alreadyMappedIndicator: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  alreadyMappedText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  searchPromptText: {
    textAlign: 'center',
    padding: 16,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  noResultsText: {
    textAlign: 'center',
    padding: 16,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  selectedCountContainer: {
    backgroundColor: THEME.primary + '10',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  selectedCountText: {
    color: THEME.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  noMappingsText: {
    textAlign: 'center',
    padding: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  loadingIndicator: {
    padding: 16,
  },
  mappedStudentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  mappedStudentInfo: {
    flex: 1,
  },
  mappedStudentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  mappedStudentEmail: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
  },
  removeMappingButton: {
    padding: 8,
  },
  studentDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  studentDetailsChip: {
    backgroundColor: THEME.lighter + '20',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 2,
    borderWidth: 1,
    borderColor: THEME.lighter + '40',
    alignSelf: 'flex-start',
  },
  studentDetailsText: {
    fontSize: 11,
    color: THEME.primary,
  },
});