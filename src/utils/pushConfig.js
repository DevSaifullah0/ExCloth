import {
  Platform,
} from 'react-native';

import Config from 'react-native-config';


export const isIOSPushNotificationsEnabled =
  () =>
    String(
      Config.IOS_PUSH_NOTIFICATIONS_ENABLED ||
        '',
    ).toLowerCase() ===
    'true';


export const isPushNotificationsEnabled =
  (platform = Platform.OS) =>
    platform === 'android' ||
    (platform === 'ios' &&
      isIOSPushNotificationsEnabled());
