import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mmddyyyy.app',
  appName: 'mmddyyyy',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#1D1C1C',
    scrollEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#1D1C1C',
      androidSplashResourceName: 'splash',
      showSpinner: false
    }
  }
};

export default config;
