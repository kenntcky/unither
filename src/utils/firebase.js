import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import firebaseConfig from '../../firebase.json';

// Helper function to safely log objects without circular references
const safeLog = (label, obj) => {
  try {
    console.log(label, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.log(label, 'Could not stringify object:', Object.keys(obj));
  }
};

export const initializeFirebase = async () => {
  try {
    // Get web client ID with fallback to avoid errors
    const webClientId = 
      (firebaseConfig && 
       firebaseConfig['react-native'] && 
       firebaseConfig['react-native'].web_client_id) || 
      '1079165970813-nd7338fdhu9bmusavruj5193k6blckqu.apps.googleusercontent.com';
    
    safeLog('FirebaseConfig', firebaseConfig);
    console.log(`Configuring Google Sign-In with webClientId: ${webClientId}`);
    
    // Configure Google Sign-In with all required options for ID token
    GoogleSignin.configure({
      webClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      scopes: ['profile', 'email'],
      // Request ID token (this is critical for Firebase Auth)
      iosClientId: firebaseConfig?.['react-native']?.ios_client_id || undefined,
      hostedDomain: '',  // Set to empty string for any domain
      openIdRealm: '',   // Optional OpenID 2.0 realm
      profileImageSize: 120, // Default profile image size in pixels
    });
    
    // Log configuration status
    console.log('GoogleSignin has been configured');
    
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}; 