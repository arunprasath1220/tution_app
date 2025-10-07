import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
enableScreens(true);
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Admin/AdminDashboard';
import AdminBottomRoutes from './Routes/AdminBottomroutes';

const Stack = createNativeStackNavigator();

export default function Router() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
      >
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Dashboard" 
          component={Dashboard} 
        />
        <Stack.Screen
          name="AdminHome"
          component={AdminBottomRoutes}
          options={{ 
            headerShown: false,
            title: 'Admin Dashboard'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
