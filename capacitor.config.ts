import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // This becomes the Android package name (must stay unique on the Play Store).
  appId: 'com.el3bhasah.app',
  appName: 'المواجهة',
  webDir: 'dist',
  backgroundColor: '#09090b',
  android: {
    backgroundColor: '#09090b'
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
