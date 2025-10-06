import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { API_URL } from '../../utils/env';
// Import icons
// Note: You'll need to install react-native-vector-icons if not already installed
// npm install react-native-vector-icons
// Then link it: npx react-native link react-native-vector-icons
// If you have trouble with the icon imports, you can try alternative approaches:
// 1. Use Image component instead:
// import { Image } from 'react-native';
// or
// 2. Use a different icon set that's included in the package:
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    console.log(API_URL);
    if (!email || !password) return Alert.alert('Please enter email and password');
    try { 
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log("hi");
      const data = await res.json();
      if (!res.ok) return Alert.alert('Login failed', data.error || 'Invalid credentials');
      navigation.replace('Dashboard', { user: data });
    } catch (err) {
      Alert.alert('Network error', String(err));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image 
          // Replace with your actual logo or use a placeholder
          source={{ uri: 'https://via.placeholder.com/280x80?text=Tution+app' }} 
          style={styles.logo} 
        />
        
        <Text style={styles.instituteTitle}>Tution app</Text>
        
        <View style={styles.field}>
          <View style={styles.iconLabel}>
            <Icon name="email" size={18} color="#6B7280" />
            <Text style={styles.label}>Email Address</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput 
              value={email} 
              onChangeText={setEmail} 
              style={styles.input} 
              placeholder="you@example.com" 
              autoCapitalize="none" 
            />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.iconLabel}>
            <Icon name="lock" size={18} color="#6B7280" />
            <Text style={styles.label}>Password</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput 
              value={password} 
              onChangeText={setPassword} 
              style={styles.input} 
              placeholder="••••••" 
              secureTextEntry={!showPassword} 
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In to Dashboard</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.or}>OR CONTINUE WITH</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.googleBtn}>
          <Icon name="account-circle" size={20} color="#4285F4" />
          <Text style={styles.googleText}>Continue with Google</Text>
          <Icon name="arrow-forward" size={16} color="#6B7280" />
        </TouchableOpacity>

        <Text style={styles.footer}>Need assistance? Contact your system administrator</Text>
        
        <View style={styles.linkContainer}>
          <TouchableOpacity>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.linkSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.linkSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.link}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24, 
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5'
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  logo: { 
    width: 100, 
    height: 100, 
    resizeMode: 'contain', 
    marginTop: 8, 
    marginBottom: 8
  },
  instituteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 16,
    textAlign: 'center'
  },
  field: { 
    width: '100%', 
    marginBottom: 16 
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { 
    marginLeft: 6,
    color: '#4A5568',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 8,
    overflow: 'hidden',
  },
  input: { 
    flex: 1,
    padding: 12,
    color: '#1A202C', 
    fontSize: 14,
  },
  eyeIcon: {
    padding: 10,
  },
  button: { 
    width: '100%', 
    marginTop: 18, 
    backgroundColor: '#4C1D95', 
    padding: 14, 
    borderRadius: 8, 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center', 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600',
    marginRight: 8,
  },
  dividerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '100%', 
    marginVertical: 18,
  },
  divider: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#E2E8F0',
  },
  or: { 
    marginHorizontal: 10, 
    color: '#718096', 
    fontSize: 12,
    fontWeight: '500',
  },
  googleBtn: { 
    width: '100%', 
    padding: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  googleText: { 
    color: '#4A5568',
    fontWeight: '500',
    marginLeft: 10,
    marginRight: 'auto',
  },
  footer: { 
    marginTop: 24, 
    color: '#718096', 
    fontSize: 12, 
    textAlign: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  link: {
    color: '#4C1D95',
    fontSize: 12,
  },
  linkSeparator: {
    color: '#718096',
    marginHorizontal: 6,
    fontSize: 12,
  }
});
