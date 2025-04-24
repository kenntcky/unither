import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../screens/HomeScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import SubjectsScreen from '../screens/SubjectsScreen';
import AddSubjectScreen from '../screens/AddSubjectScreen';
import AddAssignmentScreen from '../screens/AddAssignmentScreen';
import AssignmentDetailsScreen from '../screens/AssignmentDetailsScreen';
import Colors from '../constants/Colors';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: Colors.primary,
      },
      headerTintColor: Colors.text,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
    <Stack.Screen name="AddAssignment" component={AddAssignmentScreen} options={({ route }) => ({
      title: route.params?.edit ? 'Edit Assignment' : 'Add Assignment'
    })} />
    <Stack.Screen 
      name="AssignmentDetails" 
      component={AssignmentDetailsScreen} 
    /> 
  </Stack.Navigator>
);

const AssignmentsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: Colors.primary,
      },
      headerTintColor: Colors.text,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen name="Assignments" component={AssignmentsScreen} />
    <Stack.Screen name="AddAssignment" component={AddAssignmentScreen} options={({ route }) => ({
      title: route.params?.edit ? 'Edit Assignment' : 'Add Assignment'
    })} />
    <Stack.Screen 
      name="AssignmentDetails" 
      component={AssignmentDetailsScreen} 
    /> 
  </Stack.Navigator>
);

const SubjectsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: Colors.primary,
      },
      headerTintColor: Colors.text,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen name="Subjects" component={SubjectsScreen} />
    <Stack.Screen name="AddSubject" component={AddSubjectScreen} options={{ title: 'Add Subject' }} />
    <Stack.Screen name="AddAssignment" component={AddAssignmentScreen} options={({ route }) => ({
      title: route.params?.edit ? 'Edit Assignment' : 'Add Assignment'
    })} />
    <Stack.Screen 
      name="AssignmentDetails" 
      component={AssignmentDetailsScreen} 
    /> 
  </Stack.Navigator>
);

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'HomeTab') {
              iconName = 'home';
            } else if (route.name === 'AssignmentsTab') {
              iconName = 'assignment';
            } else if (route.name === 'SubjectsTab') {
              iconName = 'book';
            }

            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: {
            backgroundColor: Colors.primary,
            borderTopWidth: 0,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="HomeTab" 
          component={HomeStack} 
          options={{ 
            title: 'Home',
          }} 
        />
        <Tab.Screen 
          name="AssignmentsTab" 
          component={AssignmentsStack} 
          options={{ 
            title: 'Assignments',
          }} 
        />
        <Tab.Screen 
          name="SubjectsTab" 
          component={SubjectsStack} 
          options={{ 
            title: 'Subjects',
          }} 
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;