import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
enableScreens(true);
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Admin/AdminDashboard';
import AdminBottomRoutes from './Routes/AdminBottomroutes';
import FacultyBottomroutes from './Routes/FacultyBottomroutes';
import StudentBottomroutes from './Routes/StudentBottomroutes';
import { StatusBar } from 'react-native';

const Stack = createNativeStackNavigator();

export default function Router() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f0f0" />
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
        <Stack.Screen
          name="FacultyHome"
          component={FacultyBottomroutes}
          options={{ 
            headerShown: false,
            title: 'Faculty Dashboard'
          }}
        />
        <Stack.Screen
          name="StudentHome"
          component={StudentBottomroutes}
          options={{ 
            headerShown: false,
            title: 'Student Dashboard'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
