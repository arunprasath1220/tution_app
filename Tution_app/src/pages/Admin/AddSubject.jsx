import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddSubject() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Subject</Text>
      <Text style={styles.text}>Add and manage course subjects</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  text: { color: '#444' },
});