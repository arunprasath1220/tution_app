import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FacultyList() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Faculty List</Text>
      <Text style={styles.text}>View and manage all faculty members</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  text: { color: '#444' },
});