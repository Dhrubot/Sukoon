import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import StorageService from './StorageService';
import { UserProfile, AuthState, OnboardingProgress } from '../types';

// Register the custom scheme for web redirect
WebBrowser.maybeCompleteAuthSession();

class AuthService {
  private currentUser: FirebaseAuthTypes.User | null = null;
  private authStateListener: (() => void) | null = null;

  // Configure Google Auth Request - outside the class methods so it persists
  private googleConfig = {
    expoClientId: 'YOUR_EXPO_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
    scopes: ['profile', 'email']
  };

  async initialize() {
    try {
      // Set up auth state listener
      this.authStateListener = auth().onAuthStateChanged(async (user) => {
        this.currentUser = user;
        
        if (user) {
          // User is signed in
          await this.syncUserData();
          StorageService.setUserId(user.uid);
        } else {
          // User is signed out
          StorageService.clearUserId();
        }
      });

      // Check if user was previously signed in
      const savedUserId = StorageService.getUserId();
      if (savedUserId && !this.currentUser) {
        // Try to restore session
        await this.checkAuthState();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      return false;
    }
  }

  async checkAuthState(): Promise<AuthState> {
    try {
      const user = auth().currentUser;
      
      if (user) {
        return {
          isAuthenticated: true,
          isAnonymous: user.isAnonymous,
          user: await this.getUserProfile(user.uid),
        };
      }
      
      return {
        isAuthenticated: false,
        isAnonymous: false,
        user: null,
      };
    } catch (error) {
      console.error('Failed to check auth state:', error);
      return {
        isAuthenticated: false,
        isAnonymous: false,
        user: null,
      };
    }
  }

  async signInAnonymously(): Promise<UserProfile | null> {
    try {
      const credential = await auth().signInAnonymously();
      const user = credential.user;
      
      // Create basic user profile
      const userProfile: UserProfile = {
        id: user.uid,
        isAnonymous: true,
        createdAt: new Date(),
        settings: StorageService.getUserSettings() || StorageService.getDefaultSettings(),
        preferences: {
          notifications: true,
          shareAnalytics: false,
          language: 'en'
        }
      };

      // Save to Firestore
      await this.saveUserProfile(userProfile);
      
      return userProfile;
    } catch (error) {
      console.error('Anonymous sign in failed:', error);
      return null;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<UserProfile | null> {
    try {
      const credential = await auth().signInWithEmailAndPassword(email, password);
      return await this.handleSignInSuccess(credential.user);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async signUpWithEmail(email: string, password: string, name: string): Promise<UserProfile | null> {
    try {
      const credential = await auth().createUserWithEmailAndPassword(email, password);
      
      // Update display name
      await credential.user.updateProfile({
        displayName: name,
      });

      return await this.handleSignInSuccess(credential.user);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async signInWithGoogle(): Promise<UserProfile | null> {
    try {
      // Create a Google Auth Request
      const [request, response, promptAsync] = await Google.useIdTokenAuthRequest(this.googleConfig);
      
      // Prompt the user to sign in
      const result = await promptAsync();
      
      if (result.type !== 'success') {
        throw new Error('Google Sign In was cancelled or failed');
      }
      
      // Get the ID token
      const { id_token } = result.params;
      
      // Create a credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(id_token);
      
      // Sign in with the credential
      const userCredential = await auth().signInWithCredential(googleCredential);
      
      return await this.handleSignInSuccess(userCredential.user);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async signInWithApple(): Promise<UserProfile | null> {
    try {
      if (Platform.OS !== 'ios' && Platform.OS !== 'web') {
        throw new Error('Apple Sign In is only available on iOS and web');
      }
      
      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Ensure we have an identity token
      if (!credential.identityToken) {
        throw new Error('Apple Sign In failed - no identity token returned');
      }
      
      // Create a credential using the token
      const { identityToken } = credential;
      const nonce = (credential as any).nonce || '';
      const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);

      // Sign in with credential
      const userCredential = await auth().signInWithCredential(appleCredential);
      
      // Update user profile with Apple data if available
      if (credential.fullName) {
        const displayName = `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim();
        if (displayName) {
          await userCredential.user.updateProfile({ displayName });
        }
      }
      
      return await this.handleSignInSuccess(userCredential.user);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async linkAnonymousAccount(method: 'email' | 'google' | 'apple', ...args: any[]): Promise<UserProfile | null> {
    try {
      const user = auth().currentUser;
      if (!user || !user.isAnonymous) {
        throw new Error('No anonymous user to link');
      }

      let credential: FirebaseAuthTypes.AuthCredential;

      switch (method) {
        case 'email':
          const [email, password] = args;
          credential = auth.EmailAuthProvider.credential(email, password);
          break;
          
        case 'google':
          // Create a Google Auth Request
          const [request, response, promptAsync] = await Google.useIdTokenAuthRequest(this.googleConfig);
          
          // Prompt the user to sign in
          const result = await promptAsync();
          
          if (result.type !== 'success') {
            throw new Error('Google Sign In was cancelled or failed');
          }
          
          // Get the ID token
          const { id_token } = result.params;
          credential = auth.GoogleAuthProvider.credential(id_token);
          break;
          
        case 'apple':
          // Request Apple authentication
          const appleSignInResult = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          
          if (!appleSignInResult.identityToken) {
            throw new Error('Apple Sign In failed - no identity token returned');
          }

          const nonce = (appleSignInResult as any).nonce || '';
          
          credential = auth.AppleAuthProvider.credential(
            appleSignInResult.identityToken,
            nonce
          );
          break;
          
        default:
          throw new Error(`Unsupported authentication method: ${method}`);
      }

      // Link the anonymous account with the credential
      const result = await user.linkWithCredential(credential);
      return await this.handleSignInSuccess(result.user);
      
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  private async handleSignInSuccess(user: FirebaseAuthTypes.User): Promise<UserProfile | null> {
    try {
      // Check if user profile exists
      let userProfile = await this.getUserProfile(user.uid);
      
      if (!userProfile) {
        // Create new user profile if it doesn't exist
        userProfile = {
          id: user.uid,
          email: user.email || undefined,
          name: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
          isAnonymous: user.isAnonymous,
          createdAt: new Date(),
          lastSeen: new Date(),
          settings: StorageService.getUserSettings() || StorageService.getDefaultSettings(),
          preferences: {
            notifications: true,
            shareAnalytics: false,
            language: 'en'
          }
        };
        
        await this.saveUserProfile(userProfile);
      } else {
        // Update last seen
        await this.updateUserLastSeen(user.uid);
      }
      
      // Ensure local user settings are synced
      await this.syncUserData();
      
      return userProfile;
    } catch (error) {
      console.error('Failed to handle sign-in:', error);
      return null;
    }
  }

  async signOut(): Promise<boolean> {
    try {
      // Sign out from Firebase Auth
      await auth().signOut();
      
      // Clear local user ID
      StorageService.clearUserId();
      
      return true;
    } catch (error) {
      console.error('Sign out failed:', error);
      return false;
    }
  }

  async deleteAccount(): Promise<boolean> {
    try {
      const user = auth().currentUser;
      if (!user) return false;
      
      // Delete user data from Firestore
      await firestore().collection('users').doc(user.uid).delete();
      
      // Delete the authentication account
      await user.delete();
      
      // Clear local storage
      StorageService.clearUserId();
      
      return true;
    } catch (error) {
      console.error('Account deletion failed:', error);
      return false;
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      await auth().sendPasswordResetEmail(email);
      return true;
    } catch (error) {
      console.error('Password reset failed:', error);
      return false;
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const user = auth().currentUser;
      if (!user) return false;
      
      // Update Firebase Auth profile if needed
      if (updates.name || updates.photoURL) {
        await user.updateProfile({
          displayName: updates.name,
          photoURL: updates.photoURL,
        });
      }
      
      // Update Firestore document
      await firestore().collection('users').doc(user.uid).update({
        ...updates,
        lastSeen: new Date(),
      });
      
      return true;
    } catch (error) {
      console.error('Profile update failed:', error);
      return false;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const doc = await firestore().collection('users').doc(userId).get();
      
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt,
          lastSeen: data.lastSeen,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  private async saveUserProfile(profile: UserProfile): Promise<boolean> {
    try {
      await firestore().collection('users').doc(profile.id).set(profile, { merge: true });
      return true;
    } catch (error) {
      console.error('Failed to save user profile:', error);
      return false;
    }
  }

  private async updateUserLastSeen(userId: string): Promise<void> {
    try {
      await firestore().collection('users').doc(userId).update({
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error('Failed to update last seen:', error);
    }
  }

  async syncUserData(): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) return;
      
      const userProfile = await this.getUserProfile(user.uid);
      if (!userProfile) return;
      
      // Sync user settings
      const localSettings = StorageService.getUserSettings();
      if (!localSettings) {
        // Use cloud settings if available
        StorageService.setUserSettings(userProfile.settings);
      } else if (userProfile.settings) {
        // Merge settings with priority to local changes
        StorageService.updateUserSettings(userProfile.settings);
      }
      
      // Update family group info if available
      if (userProfile.familyGroupId) {
        // This would be implemented in your FamilySharingService
        // familySharingService.setCurrentFamilyId(userProfile.familyGroupId);
      }
    } catch (error) {
      console.error('Failed to sync user data:', error);
    }
  }

  getCurrentUserId(): string | null {
    return auth().currentUser?.uid || null;
  }

  isSignedIn(): boolean {
    return !!auth().currentUser;
  }

  private handleAuthError(error: any): Error {
    let message = 'Authentication failed. Please try again.';
    
    if (error.code) {
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          message = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;
        case 'auth/email-already-in-use':
          message = 'This email is already registered.';
          break;
        case 'auth/weak-password':
          message = 'Password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection.';
          break;
        default:
          message = error.message || message;
      }
    }
    
    return new Error(message);
  }

  async setOnboardingProgress(progress: OnboardingProgress): Promise<void> {
    StorageService.setOnboardingProgress(progress);
  }

  async getOnboardingProgress(): Promise<OnboardingProgress | null> {
    return StorageService.getOnboardingProgress();
  }

  async migrateAnonymousData(): Promise<boolean> {
    if (!StorageService.isDataMigrated()) {
      // Perform data migration logic here...
      // For example, moving local prayer records to the cloud
      const allRecords = StorageService.getAllPrayerRecords();
      const userId = this.getCurrentUserId();
      
      if (userId && allRecords.length > 0) {
        try {
          // Upload records to Firestore
          const batch = firestore().batch();
          
          allRecords.forEach(record => {
            const ref = firestore().collection('users').doc(userId)
              .collection('prayerRecords').doc(`${record.date}_${record.prayer}`);
            batch.set(ref, record);
          });
          
          await batch.commit();
          StorageService.setDataMigrated(true);
          return true;
        } catch (error) {
          console.error('Data migration failed:', error);
          return false;
        }
      }
    }
    
    return true; // Already migrated or nothing to migrate
  }
}

export default new AuthService();