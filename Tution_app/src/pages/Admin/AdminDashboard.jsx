import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function Dashboard({ navigation, route }) {
  const user = route.params?.user;
  
  useEffect(() => {
    // If user is an admin, automatically redirect to admin bottom tabs
    if (user?.role === 'admin') {
      navigation.replace('AdminHome');
    }
  }, []);

  const navigateToAdminHome = () => {
    navigation.navigate('AdminHome');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Dashboard</Text>
      <Text style={styles.text}>Logged in as: {user?.email}</Text>
      <Text style={styles.text}>Role: {user?.role}</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={navigateToAdminHome}
      >
        <Text style={styles.buttonText}>Go to Admin Panel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  text: { color: '#444', marginBottom: 8 },
  button: {
    backgroundColor: '#4C1D95',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600'
  }
});
