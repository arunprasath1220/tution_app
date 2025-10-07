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
import { API_URL } from '../../utils/env';

export default function AddSubject() {
  const [modalVisible, setModalVisible] = useState(false);
  const [standard, setStandard] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [board, setBoard] = useState('');
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    fetchSubjects();
    checkDatabase(); // Check database status on mount
  }, []);

  // Check database connection and structure
  const checkDatabase = async () => {
    try {
      console.log('🔍 Checking database...');
      const response = await fetch(`${API_URL}/admin/check-db`);
      const data = await response.json();
      console.log('📋 Database check result:', data);
      setDbStatus(data);
    } catch (error) {
      console.error('❌ Database check failed:', error);
      setDbStatus({ success: false, error: error.message });
    }
  };

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
      
      const response = await fetch(`${API_URL}/admin/subjects`, {
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

  const renderItem = ({ item }) => (
    <View style={styles.subjectItem}>
      <Text style={styles.itemText}>ID: {item.id}</Text>
      <Text style={styles.itemText}>Standard: {item.standard}</Text>
      <Text style={styles.itemText}>Subject: {item.subjectname}</Text>
      <Text style={styles.itemText}>Board: {item.board}</Text>
      {/* created_at will not show since it's not in the table */}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subject Management</Text>
      
      {/* Database Status */}
      {dbStatus && (
        <View style={[
          styles.statusBar, 
          dbStatus.success ? styles.statusSuccess : styles.statusError
        ]}>
          <Text style={styles.statusText}>
            Database: {dbStatus.success ? 'Connected' : 'Error'} 
            {dbStatus.totalSubjects !== undefined && ` | Subjects: ${dbStatus.totalSubjects}`}
          </Text>
        </View>
      )}

      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Add Subject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchSubjects}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Subject List */}
      <View style={styles.listContainer}>
        <Text style={styles.subTitle}>
          Subjects ({subjects.length})
        </Text>
        
        <FlatList
          data={subjects}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          refreshing={refreshing}
          onRefresh={fetchSubjects}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No subjects found</Text>
              <TouchableOpacity onPress={checkDatabase}>
                <Text style={styles.debugText}>Tap to check database</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* Add Subject Modal */}
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
            <Text style={styles.modalTitle}>Add New Subject</Text>
            
            <ScrollView style={styles.formContainer}>
              <Text style={styles.inputLabel}>Standard *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                keyboardType="numeric"
                value={standard}
                onChangeText={setStandard}
              />

              <Text style={styles.inputLabel}>Subject Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Mathematics"
                value={subjectName}
                onChangeText={setSubjectName}
              />

              <Text style={styles.inputLabel}>Board *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., CBSE, ICSE"
                value={board}
                onChangeText={setBoard}
              />
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20,
    backgroundColor: '#fff'
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    marginBottom: 10,
    color: '#333'
  },
  statusBar: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  statusSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  statusError: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  addButton: {
    backgroundColor: '#4c6ef5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10
  },
  refreshButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: 100,
    alignItems: 'center'
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center'
  },
  listContainer: {
    flex: 1
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333'
  },
  subjectItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4c6ef5'
  },
  itemText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 8
  },
  debugText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#4c6ef5',
    textDecorationLine: 'underline'
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
    borderRadius: 12,
    paddingVertical: 25,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: '#333'
  },
  formContainer: {
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 6,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    width: '48%',
    alignItems: 'center'
  },
  closeButton: {
    backgroundColor: '#f1f3f5',
  },
  submitButton: {
    backgroundColor: '#4c6ef5',
  },
  closeButtonText: {
    color: '#495057',
    fontWeight: '600'
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600'
  }
});