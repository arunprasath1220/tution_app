import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddUser() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add User</Text>
      <Text style={styles.text}>Add new faculty members and students</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  text: { color: '#444' },
});