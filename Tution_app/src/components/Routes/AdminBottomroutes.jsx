import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import Admin screens
import AssignFaculty from '../../pages/Admin/AssignFaculty';
import FacultyList from '../../pages/Admin/FacultyList';
import StudentList from '../../pages/Admin/StudentList';
import AddSubject from '../../pages/Admin/AddSubject';
import AddUser from '../../pages/Admin/AddUser';

const tabs = [
  {
    name: 'AssignFaculty',
    component: AssignFaculty,
    icon: 'assignment',
    title: 'Assign Faculty'
  },
  {
    name: 'FacultyList',
    component: FacultyList,
    icon: 'people',
    title: 'Fac_list'
  },
  {
    name: 'StudentList',
    component: StudentList,
    icon: 'school',
    title: 'Std_list'
  },
  {
    name: 'AddSubject',
    component: AddSubject,
    icon: 'book',
    title: 'Add_Sub'
  },
  {
    name: 'AddUser',
    component: AddUser,
    icon: 'person-add',
    title: 'Add_user'
  }
];

export default function AdminBottomRoutes() {
  const [activeTab, setActiveTab] = useState('AssignFaculty');

  const renderComponent = () => {
    const tab = tabs.find(tab => tab.name === activeTab);
    const Component = tab.component;
    return (
      <View style={{flex: 1}}>
        {/* <View style={styles.header}>
          <Text style={styles.headerTitle}>{tab.title}</Text>
        </View> */}
        <Component />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderComponent()}
      </View>
      
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.name)}
          >
            <Icon
              name={tab.icon}
              size={24}
              color={activeTab === tab.name ? '#4C1D95' : '#718096'}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.name ? '#4C1D95' : '#718096' }
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#4C1D95',
    paddingVertical: 15,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    height: 65,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  tabText: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  }
});
