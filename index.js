/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { persistNotificationPress } from './src/services/notificationPressStore';


notifee.onBackgroundEvent(async ({
  type,
  detail,
}) => {
  if (
    type !== EventType.PRESS ||
    !detail?.notification
  ) {
    return;
  }


  try {
    await persistNotificationPress(
      detail.notification,
    );
  } catch (error) {
    if (__DEV__) {
      console.error(
        'Background notification press error:',
        error?.message || error,
      );
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
