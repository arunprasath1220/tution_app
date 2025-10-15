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
  SafeAreaView,
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
    const totalStandards = board.data.length;
    
    return (
      <View key={`board-${index}`} style={styles.boardContainer}>
        {/* Elegant Board Header with Card Design */}
        <View style={[styles.boardCard, { borderTopColor: boardColor }]}>
          <View style={styles.boardHeaderContent}>
            <View style={styles.boardTitleRow}>
              <View style={[styles.boardIconCircle, { backgroundColor: boardColor + '20' }]}>
                <Icon name="account-balance" size={22} color={boardColor} />
              </View>
              <View style={styles.boardTextContainer}>
                <Text style={[styles.boardTitle, { color: boardColor }]}>{board.title}</Text>
                <Text style={styles.boardSubtitle}>
                  {totalStandards} {totalStandards === 1 ? 'standard' : 'standards'} available
                </Text>
              </View>
            </View>
          </View>
          
          {/* Standards within this board */}
          <View style={styles.standardsContainer}>
            {board.data.map((standardGroup, stdIndex) => renderStandardGroup(standardGroup, boardColor, stdIndex))}
          </View>
        </View>
      </View>
    );
  };

  const renderStandardGroup = (standardGroup, boardColor, index) => {
    const standardColor = boardColor === THEME.primary ? THEME.light : 
                         boardColor === THEME.light ? THEME.lighter : 
                         boardColor === THEME.lighter ? THEME.lightest :
                         THEME.primary;
                         
    return (
      <View key={`std-${index}`} style={styles.standardContainer}>
        {/* Elegant Standard Header */}
        <View style={styles.standardCard}>
          <View style={styles.standardHeaderRow}>
            <View style={[styles.standardIconCircle, { backgroundColor: standardColor + '20' }]}>
              <Icon name="class" size={18} color={standardColor} />
            </View>
            <Text style={[styles.standardTitle, { color: standardColor }]}>
              Standard {standardGroup.standard}
            </Text>
            <Text style={styles.standardSubjectCount}>
              {standardGroup.subjects.length} {standardGroup.subjects.length === 1 ? 'subject' : 'subjects'}
            </Text>
          </View>
          
          {/* Subjects within this standard */}
          <View style={styles.subjectsGrid}>
            {standardGroup.subjects.map((subject, subIndex) => renderSubject(subject, standardColor, subIndex))}
          </View>
        </View>
      </View>
    );
  };

  const renderSubject = (subject, standardColor, index) => {
    const subjectColor = standardColor === THEME.light ? THEME.lighter : 
                       standardColor === THEME.lighter ? THEME.lightest :
                       standardColor === THEME.lightest ? THEME.primary :
                       THEME.light;
                       
    return (
      <TouchableOpacity 
        key={`subject-${subject.id}`} 
        style={styles.subjectChip}
        onPress={() => openSubjectActionModal(subject)}
        activeOpacity={0.7}
      >
        <View style={[styles.subjectIconDot, { backgroundColor: subjectColor }]} />
        <Text style={styles.subjectChipText} numberOfLines={1}>{subject.subjectname}</Text>
        <Icon name="more-vert" size={16} color="#999" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        backgroundColor={THEME.primary}
        translucent={false}
        hidden={false}
      />
      <View style={styles.container}>
        {/* Elegant Header with Gradient Effect */}
        <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Subject Management</Text>
            <Text style={styles.headerSubtitle}>Organize and manage your academic subjects</Text>
          </View>
          <TouchableOpacity 
            style={styles.headerAddButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={28} color={THEME.text.light} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subject List - Hierarchical Structure with Better Grouping */}
      <ScrollView 
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={fetchSubjects}
      >
        {/* Quick Stats Dashboard in Single Line */}
        <View style={styles.statsDashboard}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCard1]}>
              <Icon name="library-books" size={20} color={THEME.primary} />
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>{subjects.length}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
            </View>
            
            <View style={[styles.statCard, styles.statCard2]}>
              <Icon name="school" size={20} color={THEME.light} />
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>
                  {[...new Set(subjects.map(s => s.standard))].length}
                </Text>
                <Text style={styles.statLabel}>Standards</Text>
              </View>
            </View>
            
            <View style={[styles.statCard, styles.statCard3]}>
              <Icon name="account-balance" size={20} color={THEME.lighter} />
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>
                  {[...new Set(subjects.map(s => s.board))].length}
                </Text>
                <Text style={styles.statLabel}>Boards</Text>
              </View>
            </View>
          </View>
        </View>

        {nestedSubjects.length > 0 ? (
          <View style={styles.subjectsWrapper}>
            <View style={styles.sectionHeaderContainer}>
              <Icon name="folder-open" size={20} color={THEME.primary} />
              <Text style={styles.sectionHeaderText}>All Subjects</Text>
              <View style={styles.sectionHeaderLine} />
            </View>
            {nestedSubjects.map((board, index) => renderBoard(board, index))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name="library-books" size={60} color={THEME.lightest} />
            </View>
            <Text style={styles.emptyTitle}>No Subjects Yet</Text>
            <Text style={styles.emptyText}>Start by adding your first subject to organize your courses</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setModalVisible(true)}
            >
              <Icon name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.primary,
  },
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
    // elevation: 1,
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
  // Board Card - Completely Redesigned
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  boardBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  boardBadgeText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  standardsContainer: {
    marginTop: 8,
  },
  // Standard Card - Elegant Design
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
  standardBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  standardBadgeText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  // Subjects Grid - Chip Design
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  subjectChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    margin: 4,
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
    maxWidth: 150,
  },
  // Empty State - More Attractive
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
  formFieldContainer: {
    marginBottom: 18,
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
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.lightest + '15',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: THEME.lightest,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    color: THEME.text.dark,
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
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
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#636e72',
    fontWeight: '700',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: THEME.primary,
    borderLeftWidth: 0.5,
    borderLeftColor: '#e9ecef',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  // Action Modal - Updated for Better UX
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
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});