import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = {
  appId: 'com.outsideorelse.game', appName: 'Outside or Else!', webDir: 'dist',
  loggingBehavior: 'none', // Bridge debug logging includes private messages/photos.
  android: { allowMixedContent: false },
}
export default config
