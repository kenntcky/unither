import React, { createContext, useState, useEffect, useContext } from 'react';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeFirebase } from '../utils/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize Firebase
  useEffect(() => {
    const setup = async () => {
      await initializeFirebase();
    };
    setup();
  }, []);

  // Handle user state changes
  function onAuthStateChanged(user) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // Unsubscribe on unmount
  }, []);

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
  const signUp = async (email, password, displayName) => {
    setLoading(true);
    try {
      const response = await auth().createUserWithEmailAndPassword(email, password);
      await response.user.updateProfile({ displayName });
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initializing,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 