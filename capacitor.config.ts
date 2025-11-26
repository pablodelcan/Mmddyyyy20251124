import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mmddyyyy.app',
  appName: 'mmddyyyy',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#FBF8E8',
    scrollEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#FBF8E8',
      androidSplashResourceName: 'splash',
      showSpinner: false
    }
  }
};

export default config;
