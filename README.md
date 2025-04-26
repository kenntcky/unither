# TaskMaster

A React Native app for managing assignments and subjects.

## Security Notice for Git

When pushing this project to Git, make sure to:

1. **NEVER commit sensitive files** like:
   - `firebase.json` (contains API keys)
   - `google-services.json` (in android/app folder)
   - `GoogleService-Info.plist` (for iOS)
   - Keystore files
   - `.env` files with secrets

2. **Use the example files** as templates:
   - Copy `firebase.example.json` to `firebase.json` and add your keys
   - Create your own `google-services.json` from Firebase console

3. **First-time setup for contributors**:
   ```
   # Clone the repository
   git clone <your-repo-url>
   
   # Copy and configure sample files
   cp firebase.example.json firebase.json
   # Then edit firebase.json with your own Firebase credentials
   
   # Install dependencies
   npm install
   ```

## Firebase Authentication Setup

This app uses Firebase Authentication for user management. Follow these steps to set it up:

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Register your app in the Firebase project (both Android and iOS if applicable)
3. Enable Authentication in the Firebase console:
   - Go to Authentication > Sign-in method
   - Enable Email/Password authentication
   - Enable Google authentication
4. For Google Auth:
   - Follow the steps to configure OAuth consent screen in Google Cloud Console
   - Add your SHA-1 fingerprint for Android
   - Configure your iOS app with the correct bundle identifier
5. Update the `firebase.json` file with your client IDs:
   ```json
   {
     "react-native": {
       "android_client_id": "YOUR_ANDROID_CLIENT_ID",
       "ios_client_id": "YOUR_IOS_CLIENT_ID",
       "web_client_id": "YOUR_WEB_CLIENT_ID"
     }
   }
   ```
   - The web client ID is needed for Google Sign-in
   - You can find these values in your Firebase project settings

## Running the App

1. Install dependencies:
   ```
   npm install
   ```

2. Set up native code:
   ```
   npx react-native-asset
   ```

3. Run on Android:
   ```
   npm run android
   ```

4. Run on iOS (macOS only):
   ```
   cd ios && pod install && cd ..
   npm run ios
   ```

## Features

- User authentication (Email/Password and Google)
- Subject management
- Assignment tracking
- Dashboard overview

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
