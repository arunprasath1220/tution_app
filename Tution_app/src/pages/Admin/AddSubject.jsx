import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar,
  Image,
} from 'react-native';
import { API_URL } from '../../utils/env';
import Icon from 'react-native-vector-icons/MaterialIcons';

// You can replace with actual icons if you have a vector icons package installed
const BOOK_ICON = 'https://img.icons8.com/color/96/000000/book.png';

// Theme color and its variants
const THEME = {
  primary: '#4C1D95',      // Main purple theme
  light: '#6D28D9',        // Lighter purple
  lighter: '#8B5CF6',      // Even lighter purple
  lightest: '#A78BFA',     // Lightest purple
  dark: '#3B0764',         // Darker purple
  darkest: '#2E0249',      // Darkest purple
  text: {
    light: '#F5F3FF',      // Light text color for dark backgrounds
    dark: '#1F0942',       // Dark text color for light backgrounds
    muted: '#7C3AED'       // Muted text color
  },
  danger: '#DC2626'        // Red color for delete actions
};

export default function AddSubject() {
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [standard, setStandard] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [board, setBoard] = useState('');
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [nestedSubjects, setNestedSubjects] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // For edit mode
  const [editId, setEditId] = useState(null);
  const [editStandard, setEditStandard] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editBoard, setEditBoard] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Group subjects by board and then by standard
  useEffect(() => {
    if (subjects.length > 0) {
      // First group by board
      const boardGroups = {};
      
      subjects.forEach(subject => {
        const boardName = subject.board || 'Unknown';
        if (!boardGroups[boardName]) {
          boardGroups[boardName] = {};
        }
        
        // Then group by standard within each board
        const std = subject.standard.toString();
        if (!boardGroups[boardName][std]) {
          boardGroups[boardName][std] = [];
        }
        
        boardGroups[boardName][std].push(subject);
      });
      
      // Convert to nested structure for rendering
      const nested = [];
      
      // Sort board names alphabetically
      const sortedBoards = Object.keys(boardGroups).sort();
      
      sortedBoards.forEach(boardName => {
        const standardGroups = boardGroups[boardName];
        const boardSection = {
          title: boardName,
          data: [] // Will contain all standard groups
        };
        
        // Sort standards numerically
        const sortedStandards = Object.keys(standardGroups)
          .sort((a, b) => parseInt(a) - parseInt(b));
        
        sortedStandards.forEach(std => {
          // Sort subjects alphabetically within each standard
          const sortedSubjects = standardGroups[std]
            .sort((a, b) => a.subjectname.localeCompare(b.subjectname));
          
          // Add a standard group to this board's data
          boardSection.data.push({
            standard: std,
            subjects: sortedSubjects
          });
        });
        
        nested.push(boardSection);
      });
      
      setNestedSubjects(nested);
    } else {
      setNestedSubjects([]);
    }
  }, [subjects]);

  const fetchSubjects = async () => {
    try {
      setRefreshing(true);
      console.log('🔍 Fetching subjects from:', `${API_URL}/admin/subjects`);
      
      const response = await fetch(`${API_URL}/admin/subjects`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Fetch response:', data);
      
      if (data.success) {
        setSubjects(data.data || []);
        console.log(`📚 Loaded ${data.data?.length || 0} subjects`);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch subjects');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      Alert.alert(
        'Network Error', 
        `Cannot fetch subjects: ${error.message}`
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async () => {
    if (!standard.trim() || !subjectName.trim() || !board.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    const standardNum = parseInt(standard);
    if (isNaN(standardNum) || standardNum <= 0) {
      Alert.alert('Error', 'Standard must be a valid positive number');
      return;
    }

    try {
      setLoading(true);
      
      const subjectData = {
        standard: standardNum,
        subjectname: subjectName.trim(),
        board: board.trim()
      };
      
      console.log('📤 Adding subject:', subjectData);
      
      const response = await fetch(`${API_URL}/admin/addsubjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subjectData)
      });
      
      const data = await response.json();
      console.log('✅ Add subject response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Subject added successfully');
        setStandard('');
        setSubjectName('');
        setBoard('');
        setModalVisible(false);
        fetchSubjects(); // Refresh list
      } else {
        Alert.alert('Error', data.message || 'Failed to add subject');
      }
    } catch (error) {
      console.error('❌ Submission error:', error);
      Alert.alert('Error', `Failed to add subject: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit subject
  const handleEditSubmit = async () => {
    if (!editStandard.trim() || !editSubjectName.trim() || !editBoard.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    const standardNum = parseInt(editStandard);
    if (isNaN(standardNum) || standardNum <= 0) {
      Alert.alert('Error', 'Standard must be a valid positive number');
      return;
    }

    try {
      setLoading(true);
      
      const subjectData = {
        standard: standardNum,
        subjectname: editSubjectName.trim(),
        board: editBoard.trim()
      };
      
      console.log('📝 Updating subject:', subjectData);
      
      // Updated API endpoint to match backend route
      const response = await fetch(`${API_URL}/admin/updateSubject/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subjectData)
      });
      
      const data = await response.json();
      console.log('✅ Update subject response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Subject updated successfully');
        setEditModalVisible(false);
        fetchSubjects(); // Refresh list
      } else {
        Alert.alert('Error', data.message || 'Failed to update subject');
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      Alert.alert('Error', `Failed to update subject: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete subject
  const handleDeleteSubject = async () => {
    try {
      setLoading(true);
      
      console.log('🗑️ Deleting subject:', selectedSubject.id);
      
      // Updated API endpoint to match backend route
      const response = await fetch(`${API_URL}/admin/deleteSubject/${selectedSubject.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('✅ Delete subject response:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Subject deleted successfully');
        setActionModalVisible(false);
        fetchSubjects(); // Refresh list
      } else {
        Alert.alert('Error', data.message || 'Failed to delete subject');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      Alert.alert('Error', `Failed to delete subject: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open subject action modal
  const openSubjectActionModal = (subject) => {
    setSelectedSubject(subject);
    setActionModalVisible(true);
  };

  // Open edit modal with subject data
  const openEditModal = () => {
    if (selectedSubject) {
      setEditId(selectedSubject.id);
      setEditStandard(selectedSubject.standard.toString());
      setEditSubjectName(selectedSubject.subjectname);
      setEditBoard(selectedSubject.board);
      setActionModalVisible(false);
      setEditModalVisible(true);
    }
  };

  // Generate a variant of the theme color based on the board name
  const getBoardColor = (boardName) => {
    if (!boardName) return THEME.primary;
    
    const nameHash = boardName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Pick a color variant based on the hash of the name
    const variants = [
      THEME.primary,  // Main theme color
      THEME.light,    // Lighter variant
      THEME.lighter,  // Even lighter variant
      THEME.lightest, // Lightest variant
      THEME.dark,     // Darker variant
    ];
    
    return variants[nameHash % variants.length];
  };

  const renderBoard = (board, index) => {
    const boardColor = getBoardColor(board.title);
    
    return (
      <View key={`board-${index}`} style={styles.boardContainer}>
        {/* Board Header */}
        <View style={[styles.boardHeader, { borderLeftColor: boardColor }]}>
          <Text style={styles.boardTitle}>{board.title}</Text>
          <View style={[styles.boardCounter, { backgroundColor: boardColor }]}>
            <Text style={styles.boardCounterText}>
              {board.data.reduce((total, stdGroup) => total + stdGroup.subjects.length, 0)}
            </Text>
          </View>
        </View>
        
        {/* Standards within this board */}
        {board.data.map((standardGroup, stdIndex) => renderStandardGroup(standardGroup, boardColor, stdIndex))}
      </View>
    );
  };

  const renderStandardGroup = (standardGroup, boardColor, index) => {
    // Use a slightly lighter shade for standard headers
    const standardColor = boardColor === THEME.primary ? THEME.light : 
                         boardColor === THEME.light ? THEME.lighter : 
                         boardColor === THEME.lighter ? THEME.lightest :
                         THEME.primary;
                         
    return (
      <View key={`std-${index}`} style={styles.standardContainer}>
        {/* Standard Header */}
        <View style={[styles.standardHeader, { borderLeftColor: standardColor }]}>
          <Text style={styles.standardTitle}>Standard {standardGroup.standard}</Text>
          <View style={[styles.standardCounter, { backgroundColor: standardColor }]}>
            <Text style={styles.standardCounterText}>{standardGroup.subjects.length}</Text>
          </View>
        </View>
        
        {/* Subjects within this standard */}
        {standardGroup.subjects.map((subject, subIndex) => renderSubject(subject, standardColor, subIndex))}
      </View>
    );
  };

  const renderSubject = (subject, standardColor, index) => {
    // Use an even lighter shade for subject cards
    const subjectColor = standardColor === THEME.light ? THEME.lighter : 
                       standardColor === THEME.lighter ? THEME.lightest :
                       standardColor === THEME.lightest ? THEME.primary :
                       THEME.light;
                       
    return (
      <View key={`subject-${subject.id}`} style={[styles.subjectCard, { borderLeftColor: subjectColor }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.subjectName}>{subject.subjectname}</Text>
          <TouchableOpacity 
            style={styles.infoIcon}
            onPress={() => openSubjectActionModal(subject)}
          >
            <Icon name="more-vert" size={20} color={THEME.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subject Management</Text>
        <Text style={styles.headerSubtitle}>Manage your course subjects</Text>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>+ Add Subject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchSubjects}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color={THEME.primary} size="small" />
          ) : (
            <Text style={styles.refreshButtonText}>↻ Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{subjects.length}</Text>
          <Text style={styles.statLabel}>Total Subjects</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {[...new Set(subjects.map(s => s.standard))].length}
          </Text>
          <Text style={styles.statLabel}>Standards</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {[...new Set(subjects.map(s => s.board))].length}
          </Text>
          <Text style={styles.statLabel}>Boards</Text>
        </View>
      </View>

      {/* Subject List - Hierarchical Structure */}
      <ScrollView 
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
      >
        {nestedSubjects.length > 0 ? (
          <>
            {nestedSubjects.map((board, index) => renderBoard(board, index))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Image 
              source={{ uri: BOOK_ICON }} 
              style={styles.emptyIcon} 
              resizeMode="contain"
            />
            <Text style={styles.emptyText}>No subjects found</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Add Your First Subject</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Subject Modal - Full Screen */}
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
              <Text style={styles.fullScreenModalTitle}>Add New Subject</Text>
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
                <Text style={styles.fullScreenSectionTitle}>Subject Details</Text>
                
                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Standard *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 10"
                    keyboardType="numeric"
                    value={standard}
                    onChangeText={setStandard}
                    placeholderTextColor="#aaa"
                  />
                </View>

                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Subject Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Mathematics"
                    value={subjectName}
                    onChangeText={setSubjectName}
                    placeholderTextColor="#aaa"
                  />
                </View>

                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Board *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., CBSE, ICSE"
                    value={board}
                    onChangeText={setBoard}
                    placeholderTextColor="#aaa"
                  />
                </View>
                
                <View style={styles.infoContainer}>
                  <Icon name="info-outline" size={18} color={THEME.light} style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    Subjects are used to organize courses by standard and board. Students will be assigned to subjects.
                  </Text>
                </View>
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
                <Text style={styles.submitButtonText}>Add Subject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Subject Action Modal */}
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
                {selectedSubject ? selectedSubject.subjectname : 'Subject'}
              </Text>
              <Text style={styles.actionModalSubtitle}>
                {selectedSubject ? `${selectedSubject.board} - Standard ${selectedSubject.standard}` : ''}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={openEditModal}
            >
              <Icon name="edit" size={22} color={THEME.primary} style={styles.actionIcon} />
              <Text style={styles.actionText}>Edit Subject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteSubject}
            >
              <Icon name="delete" size={22} color={THEME.danger} style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: THEME.danger }]}>Delete Subject</Text>
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

      {/* Edit Subject Modal - Full Screen */}
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
              <Text style={styles.fullScreenModalTitle}>Edit Subject</Text>
              <Text style={styles.fullScreenModalSubtitle}>
                {editSubjectName}
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
                <Text style={styles.fullScreenSectionTitle}>Subject Details</Text>
                
                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Standard *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 10"
                    keyboardType="numeric"
                    value={editStandard}
                    onChangeText={setEditStandard}
                    placeholderTextColor="#aaa"
                  />
                </View>

                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Subject Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Mathematics"
                    value={editSubjectName}
                    onChangeText={setEditSubjectName}
                    placeholderTextColor="#aaa"
                  />
                </View>

                <View style={styles.formFieldContainer}>
                  <Text style={styles.inputLabel}>Board *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., CBSE, ICSE"
                    value={editBoard}
                    onChangeText={setEditBoard}
                    placeholderTextColor="#aaa"
                  />
                </View>
                
                <View style={styles.infoContainer}>
                  <Icon name="info-outline" size={18} color={THEME.light} style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    Changing the details will affect all students assigned to this subject.
                  </Text>
                </View>
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
                <Text style={styles.submitButtonText}>Update Subject</Text>
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    marginBottom: 16,
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
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.lightest + '15',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: THEME.lightest,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    color: THEME.text.dark,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
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
  actionContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -20,
    marginBottom: 20
  },
  addButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    flex: 1,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  buttonText: {
    color: THEME.primary,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center'
  },
  refreshButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  refreshButtonText: {
    color: THEME.primary,
    fontWeight: '700',
    fontSize: 15
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3.84,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: THEME.text.muted
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 10
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20
  },
  listContent: {
    paddingBottom: 20
  },
  
  // Board container and header
  boardContainer: {
    marginBottom: 16
  },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderLeftWidth: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  boardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  boardCounter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardCounterText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  
  // Standard container and header
  standardContainer: {
    marginLeft: 15,
    marginBottom: 12
  },
  standardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 5,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  standardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#343a40',
  },
  standardCounter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  standardCounterText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
  },
  
  // Subject card styles
  subjectCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    marginLeft: 15,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#343a40',
    flex: 1,
  },
  infoIcon: {
    padding: 5, 
    borderRadius: 15,
  },
  
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    marginTop: 20
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
    opacity: 0.8
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: THEME.text.muted,
    marginBottom: 20
  },
  emptyButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  
  // Modal styles
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
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: THEME.text.dark,
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
    color: THEME.text.muted,
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

  // Action Modal
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
  }
});