import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.talktrack.app',
  appName: 'TalkTrack',
  webDir: 'out',
  // Load from Vercel deployment (keeps API routes working)
  server: {
    url: 'https://talktrack-three.vercel.app',
    cleartext: false,
  },
  android: {
    backgroundColor: '#0f1729',
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#f59e0b',
    },
  },
};

export default config;
