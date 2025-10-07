import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AssignFaculty() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assign Faculty</Text>
      <Text style={styles.text}>Assign faculty members to classes and subjects</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  text: { color: '#444' },
});