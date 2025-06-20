import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import HomeScreen from "../screens/HomeScreen"
import AssignmentsScreen from "../screens/AssignmentsScreen"
import SubjectsScreen from "../screens/SubjectsScreen"
import AddSubjectScreen from "../screens/AddSubjectScreen"
import AddAssignmentScreen from "../screens/AddAssignmentScreen"
import AssignmentDetailsScreen from "../screens/AssignmentDetailsScreen"
import EditSubjectScreen from "../screens/EditSubjectScreen"
import ProfileScreen from "../screens/ProfileScreen"
import EditProfileScreen from "../screens/EditProfileScreen" // Edit Profile screen
import ProfileViewScreen from "../screens/ProfileViewScreen" // Profile View screen
import ChangePasswordScreen from "../screens/ChangePasswordScreen" // Change Password screen
import StudentGradesScreen from "../screens/StudentGradesScreen" // Student Grades screen
import GalleryScreen from "../screens/GalleryScreen" // New Gallery screen
import AlbumScreen from "../screens/AlbumScreen" // Album screen
import GalleryApprovalScreen from "../screens/GalleryApprovalScreen" // Gallery approvals screen
import LoginScreen from "../screens/auth/LoginScreen"
import RegisterScreen from "../screens/auth/RegisterScreen"
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen"
import NotificationSettingsScreen from "../screens/NotificationSettingsScreen"
import NotificationTestScreen from "../screens/NotificationTestScreen" // Notification test screen
import GenderSelectionScreen from "../screens/auth/GenderSelectionScreen"
import ClassSelectionScreen from "../screens/ClassSelectionScreen"
import CreateClassScreen from "../screens/CreateClassScreen"
import JoinClassScreen from "../screens/JoinClassScreen"
import ClassMembersScreen from "../screens/ClassMembersScreen"
import ClassSettingsScreen from "../screens/ClassSettingsScreen"
import LanguageSettingsScreen from "../screens/LanguageSettingsScreen"
import PendingApprovalsScreen from "../screens/PendingApprovalsScreen"
import AssignmentCompleteScreen from "../screens/AssignmentCompleteScreen"
import Colors from "../constants/Colors"
import { useAuth } from "../context/AuthContext"
import { ClassProvider, useClass } from "../context/ClassContext"
import { SubjectProvider } from "../context/SubjectContext"
import { AssignmentProvider } from "../context/AssignmentContext"
import ClassDataProvider from "../providers/ClassDataProvider"
import { t } from "../translations"
import AnimatedBottomBar from "../components/AnimatedBottomBar"
import AiScreen from "../screens/AiScreen"
import AddAiMaterial from "../screens/AddAiMaterial"
import AiMaterialDetails from "../screens/AiMaterialDetails"

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()
const AuthStack = createStackNavigator()
const ClassStack = createStackNavigator()

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: Colors.background },
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStack.Navigator>
)

// Main TabNavigator wrapped with all context providers
const MainNavigator = () => {
  const { currentClass } = useClass()

  return (
    <ClassDataProvider currentClass={currentClass}>
    <SubjectProvider>
      <AssignmentProvider>
        <Tab.Navigator
          tabBar={(props) => <AnimatedBottomBar {...props} />}
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.primary,
            },
            headerTintColor: Colors.text,
            headerTitleStyle: {
              fontWeight: "bold",
            },
            headerShown: false,
          }}
        >
          <Tab.Screen
            name="HomeTab"
            component={HomeStack}
            options={{
              title: t("Home"),
            }}
          />
          <Tab.Screen
            name="AssignmentsTab"
            component={AssignmentsStack}
            options={{
              title: t("Assignments"),
            }}
          />
          <Tab.Screen
            name="SubjectsTab"
            component={SubjectsStack}
            options={{
              title: t("Subjects"),
            }}
          />
          <Tab.Screen
            name="AiTab"  // Add this new tab
            component={AiStack}
            options={{
              title: t("AI"), // Make sure to add this translation key
            }}
          />
          <Tab.Screen
            name="GalleryTab"
            component={GalleryStack}
            options={{
              title: t("Gallery"),
            }}
          />
          <Tab.Screen
            name="ProfileTab"
            component={ProfileStack}
            options={{
              title: t("Profile"),
            }}
          />
        </Tab.Navigator>
      </AssignmentProvider>
    </SubjectProvider>
  </ClassDataProvider>
  )
}

// New ClassNavigator for handling class selection
const ClassNavigator = () => (
  <ClassStack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: Colors.background },
    }}
  >
    <ClassStack.Screen name="ClassSelection" component={ClassSelectionScreen} options={{ animationEnabled: true }} />
    <ClassStack.Screen name="CreateClass" component={CreateClassScreen} />
    <ClassStack.Screen name="JoinClass" component={JoinClassScreen} />
    <ClassStack.Screen name="Main" component={MainNavigator} options={{ gestureEnabled: false }} />
  </ClassStack.Navigator>
)

const HomeStack = () => (
  <Stack.Navigator
  screenOptions={{
    headerShown: false,
  }}
  >
    <Stack.Screen name="Home" component={HomeScreen} options={{ title: t("Home") }} />
    <Stack.Screen
      name="AddAssignment"
      component={AddAssignmentScreen}
      options={({ route }) => ({
        title: route.params?.edit ? t("Edit Assignment") : t("Add Assignment"),
      })}
    />
    <Stack.Screen name="AssignmentDetails" component={AssignmentDetailsScreen} />
    <Stack.Screen
      name="AssignmentComplete"
      component={AssignmentCompleteScreen}
      options={{ title: t("Complete Assignment") }}
    />
  </Stack.Navigator>
)

const AssignmentsStack = () => (
  <Stack.Navigator
  screenOptions={{
    headerShown: false,
  }}
  >
    <Stack.Screen name="Assignments" component={AssignmentsScreen} options={{ title: t("Assignments") }} />
    <Stack.Screen
      name="AddAssignment"
      component={AddAssignmentScreen}
      options={({ route }) => ({
        title: route.params?.edit ? t("Edit Assignment") : t("Add Assignment"),
      })}
    />
    <Stack.Screen name="AssignmentDetails" component={AssignmentDetailsScreen} />
    <Stack.Screen
      name="AssignmentComplete"
      component={AssignmentCompleteScreen}
      options={{ title: t("Complete Assignment") }}
    />
  </Stack.Navigator>
)

const SubjectsStack = () => (
  <Stack.Navigator
  screenOptions={{
    headerShown: false,
  }}
  >
    <Stack.Screen name="Subjects" component={SubjectsScreen} options={{ title: t("Subjects") }} />
    <Stack.Screen name="AddSubject" component={AddSubjectScreen} options={{ title: t("Add Subject") }} />
    <Stack.Screen name="EditSubject" component={EditSubjectScreen} options={{ title: t("Edit Subject") }} />
    <Stack.Screen
      name="AddAssignment"
      component={AddAssignmentScreen}
      options={({ route }) => ({
        title: route.params?.edit ? t("Edit Assignment") : t("Add Assignment"),
      })}
    />
    <Stack.Screen name="AssignmentDetails" component={AssignmentDetailsScreen} />
    <Stack.Screen
      name="AssignmentComplete"
      component={AssignmentCompleteScreen}
      options={{ title: t("Complete Assignment") }}
    />
  </Stack.Navigator>
)

const AiStack = () => (
  <Stack.Navigator
  screenOptions={{
    headerShown: false,
  }}
  >
    <Stack.Screen name="AI" component={AiScreen} options={{ title: t("AI Assistant") }} />
    <Stack.Screen name="AddAiMaterial" component={AddAiMaterial} options={{ title: t("Add AI Material") }} />
    <Stack.Screen name="AiMaterialDetails" component={AiMaterialDetails} options={{ title: t("AI Material Details") }} />
  </Stack.Navigator>
)

// New Gallery Stack
const GalleryStack = () => (
  <Stack.Navigator
  screenOptions={{
      headerStyle: {
        backgroundColor: Colors.primary,
      },
      headerTintColor: Colors.text,
      headerTitleStyle: {
        fontWeight: "bold",
      },
      headerShown: false, // Hide headers since we have custom headers in each screen
    }}
  >
    <Stack.Screen name="Gallery" component={GalleryScreen} options={{ title: t("Class Gallery") }} />
    <Stack.Screen name="AlbumScreen" component={AlbumScreen} options={{ title: t("Album") }} />
    <Stack.Screen name="GalleryApproval" component={GalleryApprovalScreen} options={{ title: t("Approve Images") }} />
  </Stack.Navigator>
)

const ProfileStack = () => (
  <Stack.Navigator
  screenOptions={{
    headerShown: false,
  }}
  >
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t("Profile") }} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: t("Edit Profile") }} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: t("Change Password") }} />
    <Stack.Screen name="StudentGrades" component={StudentGradesScreen} options={{ title: t("My Grades") }} />
    <Stack.Screen name="ProfileView" component={ProfileViewScreen} options={{ title: t("User Profile") }} />
    <Stack.Screen name="ClassMembers" component={ClassMembersScreen} options={{ title: t("Class Members") }} />
    <Stack.Screen name="ClassSettings" component={ClassSettingsScreen} options={{ title: t("Class Settings") }} />
    <Stack.Screen
      name="PendingApprovals"
      component={PendingApprovalsScreen}
      options={{ title: t("Pending Approvals") }}
    />
    <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} options={{ title: t("Language Settings") }} />
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: t("Notification Settings") }} />
    <Stack.Screen name="NotificationTest" component={NotificationTestScreen} options={{ title: t("Test Notifications") }} />
    <Stack.Screen name="AssignmentDetails" component={AssignmentDetailsScreen} />
    <Stack.Screen
      name="AssignmentComplete"
      component={AssignmentCompleteScreen}
      options={{ title: t("Complete Assignment") }}
    />
  </Stack.Navigator>
)

// New ProfileSetupNavigator for completing user profile
const ProfileSetupNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: Colors.background },
    }}
  >
    <Stack.Screen name="GenderSelection" component={GenderSelectionScreen} />
  </Stack.Navigator>
)

const AppNavigator = () => {
  const { user, initializing, needsProfileSetup } = useAuth()

  if (initializing) {
    return null // Or a loading screen
  }

  return (
    <>
      {!user ? (
        <AuthNavigator />
      ) : needsProfileSetup ? (
        <ProfileSetupNavigator />
      ) : (
        <ClassProvider>
          <ClassNavigator />
        </ClassProvider>
      )}
    </>
  )
}

export default AppNavigator
