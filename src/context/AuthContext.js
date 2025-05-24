import React, { createContext, useState, useEffect, useContext } from 'react';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { initializeFirebase } from '../utils/firebase';
import { 
  createOrUpdateUserProfile, 
  getUserProfile, 
  isClassAdmin
} from '../utils/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  // Initialize Firebase
  useEffect(() => {
    const setup = async () => {
      await initializeFirebase();
    };
    setup();
  }, []);

  // Check if user profile is complete (has gender)
  const checkProfileComplete = async (user) => {
    if (!user) {
      setNeedsProfileSetup(false);
      return;
    }
    
    try {
      const userProfile = await getUserProfile(user.uid);
      
      // Check if profile has gender
      if (!userProfile || !userProfile.gender) {
        setNeedsProfileSetup(true);
      } else {
        setNeedsProfileSetup(false);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      // Default to needing setup if we can't check
      setNeedsProfileSetup(true);
    }
  };

  // Handle user state changes
  function onAuthStateChanged(user) {
    setUser(user);
    if (user) {
      checkProfileComplete(user);
    } else {
      setNeedsProfileSetup(false);
    }
    
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // Unsubscribe on unmount
  }, []);

  // Check if user is an admin for a specific class
  const checkClassAdminStatus = async (classId) => {
    if (user) {
      return await isClassAdmin(classId, user.uid);
    }
    return false;
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, displayName, gender) => {
    setLoading(true);
    try {
      const response = await auth().createUserWithEmailAndPassword(email, password);
      await response.user.updateProfile({ displayName });
      
      // Create user profile in Firestore with gender information
      await createOrUpdateUserProfile({ 
        gender,
        displayName 
      });
      
      // Since we just created a complete profile, set needsProfileSetup to false
      setNeedsProfileSetup(false);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      // Ensure GoogleSignin is configured
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Play services checked');
      
      try {
        // Try to sign out first, but catch any errors
        try {
          // Using a safer approach - don't rely on isSignedIn
          await GoogleSignin.signOut();
          console.log('Successfully signed out from previous Google session');
        } catch (signOutError) {
          // It's okay if this fails, we'll proceed anyway
          console.log('No active Google session to sign out from');
        }
        
        // Get user info and ID token
        const userInfo = await GoogleSignin.signIn();
        console.log('Google Sign-In successful');
        
        // Additional logging to help debugging
        console.log('userInfo object keys:', Object.keys(userInfo));
        
        // Check for idToken in both possible locations
        let idToken = null;
        if (userInfo.idToken) {
          idToken = userInfo.idToken;
        } else if (userInfo.data && userInfo.data.idToken) {
          idToken = userInfo.data.idToken;
        }
        
        if (!idToken) {
          console.error('No ID token found in the response', JSON.stringify(userInfo, null, 2));
          throw new Error('No ID token present in Google Sign-In response');
        }

        console.log('Successfully retrieved ID token');

        // Create a Google credential with the token
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);

        // Sign-in the user with the credential
        await auth().signInWithCredential(googleCredential);
        
        // Check if user profile exists and has gender
        const currentUser = auth().currentUser;
        if (currentUser) {
          const userProfile = await getUserProfile(currentUser.uid);
          if (!userProfile || !userProfile.gender) {
            // We'll need to prompt for gender selection
            setNeedsProfileSetup(true);
          } else {
            setNeedsProfileSetup(false);
          }
        }
        
        return { success: true };
      } catch (signInError) {
        console.error('Detailed Google Sign-In error:', JSON.stringify(signInError, null, 2));
        throw signInError;
      }
    } catch (error) {
      console.error('Google Sign-In error details:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = error.message;
      if (error.code === 'DEVELOPER_ERROR') {
        errorMessage = 'Google Sign-In configuration error. Please check Firebase console settings.';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  // Set profile complete after gender selection
  const completeProfile = async (gender) => {
    setLoading(true);
    try {
      if (!gender) {
        throw new Error('Gender is required');
      }
      
      await createOrUpdateUserProfile({
        gender,
        displayName: user?.displayName || ''
      });
      
      setNeedsProfileSetup(false);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      // Try to sign out from Google, but don't rely on isSignedIn method
      try {
        await GoogleSignin.signOut();
        console.log('Successfully signed out from Google');
      } catch (googleError) {
        // Just log the error and continue with Firebase signout
        console.warn('Google Sign-Out error (can be ignored):', googleError);
      }
      
      // Sign out of Firebase (always do this regardless of Google Sign-In status)
      await auth().signOut();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile details
  const updateUserDetails = async (profileData) => {
    setLoading(true);
    try {
      // Ensure the user is logged in
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Only update the displayName in Auth - not storing photoURL in Auth
      // since we'll be using the Firestore version for images
      await currentUser.updateProfile({
        displayName: profileData.displayName || currentUser.displayName,
      });
      
      // Refresh user object
      setUser({ ...currentUser });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user details:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    try {
      // Ensure the user is logged in
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Get the user's email
      const email = currentUser.email;
      if (!email) {
        throw new Error('User email not available');
      }
      
      // Re-authenticate the user first
      const credential = auth.EmailAuthProvider.credential(email, currentPassword);
      await currentUser.reauthenticateWithCredential(credential);
      
      // Now change the password
      await currentUser.updatePassword(newPassword);
      
      return { success: true };
    } catch (error) {
      let errorMessage = error.message;
      
      // Provide more friendly error messages
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'The current password is incorrect.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The new password is too weak. Please use a stronger password.';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    initializing,
    loading,
    needsProfileSetup,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    completeProfile,
    changePassword,
    checkClassAdminStatus,
    updateUserDetails
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};