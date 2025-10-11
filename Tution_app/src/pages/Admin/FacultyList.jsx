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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Faculty Management</Text>
        <Text style={styles.headerSubtitle}>View and manage faculty members</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="person-add" size={18} color={THEME.text.light} />
            <Text style={styles.buttonText}>Add Faculty</Text>
          </TouchableOpacity>
          
          <Text style={styles.countText}>
            {faculties.length} Faculty Members
          </Text>
        </View>
        
        <FlatList
          data={faculties}
          renderItem={renderFacultyItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchFaculties}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="school" size={60} color={THEME.lightest} />
              <Text style={styles.emptyText}>No faculty members found</Text>
              <Text style={styles.emptySubText}>
                Add faculty members by clicking the button above
              </Text>
            </View>
          }
        />
      </View>
      
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
          
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="search" size={20} color="#6c757d" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  listContent: {
    paddingBottom: 20,
  },
  facultyItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: THEME.lighter,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2.22,
    elevation: 2,
  },
  facultyInfo: {
    flex: 1,
  },
  facultyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  facultyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  facultyEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    marginLeft: 8,
  },
  studentMapButton: {
    padding: 4,
    marginRight: 4
  },
  infoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  subjectChip: {
    backgroundColor: THEME.lightest + '20',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    margin: 2,
    borderWidth: 1,
    borderColor: THEME.lightest + '40',
  },
  subjectText: {
    fontSize: 12,
    color: THEME.primary,
  },
  noSubjectsText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
    marginTop: 4,
  },
  studentSection: {
    marginTop: 12,
  },
  studentSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  studentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  studentChip: {
    backgroundColor: THEME.success + '20',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    margin: 2,
    borderWidth: 1,
    borderColor: THEME.success + '40',
  },
  studentText: {
    fontSize: 12,
    color: THEME.success,
  },
  moreStudentsChip: {
    backgroundColor: '#e9ecef',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    margin: 2,
  },
  moreStudentsText: {
    fontSize: 12,
    color: '#6c757d',
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
  searchContainer: {
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