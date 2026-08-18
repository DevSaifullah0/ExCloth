import { useEffect } from 'react';

import {
  PermissionsAndroid,
  Platform,
} from 'react-native';

import notifee, {
  AndroidImportance,
} from '@notifee/react-native';

import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh,
  onMessage,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging';

import { supabase } from '../lib/supabase';

import {
  isPushNotificationsEnabled,
} from '../utils/pushConfig';


const FOREGROUND_CHANNEL_ID =
  'excloth_foreground_v1';


const requestNotificationPermission =
  async messaging => {
    if (Platform.OS === 'ios') {
      const status =
        await requestPermission(
          messaging,
        );


      return (
        status ===
          AuthorizationStatus.AUTHORIZED ||
        status ===
          AuthorizationStatus.PROVISIONAL
      );
    }


    if (
      Platform.OS !==
      'android'
    ) {
      return false;
    }


    if (
      Platform.Version < 33
    ) {
      return true;
    }


    const result =
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS
          .POST_NOTIFICATIONS,
      );


    return (
      result ===
      PermissionsAndroid.RESULTS.GRANTED
    );
  };


const createForegroundChannel =
  async () => {
    if (
      Platform.OS !==
      'android'
    ) {
      return null;
    }


    return await notifee.createChannel({
      id:
        FOREGROUND_CHANNEL_ID,

      name:
        'ExCloth Notifications',

      importance:
        AndroidImportance.HIGH,

      sound:
        'default',

      vibration:
        true,
    });
  };


const showForegroundNotification =
  async remoteMessage => {
    const channelId =
      await createForegroundChannel();


    const data =
      remoteMessage?.data ||
      {};


    const notificationId =
      data.notification_id ||
      remoteMessage?.messageId ||
      null;


    const title =
      remoteMessage
        ?.notification
        ?.title ||
      data.title ||
      'ExCloth';


    const body =
      remoteMessage
        ?.notification
        ?.body ||
      data.message ||
      data.body ||
      'You have a new notification.';


    const notification = {
      ...(notificationId
        ? {
            id:
              String(
                notificationId,
              ),
          }
        : {}),

      title,

      body,

      data,

      ...(Platform.OS === 'android'
        ? {
            android: {
              channelId,

              smallIcon:
                'ic_notification',

              color:
                '#000000',

              importance:
                AndroidImportance.HIGH,

              pressAction: {
                id: 'default',
              },
            },
          }
        : {
            ios: {
              sound: 'default',
            },
          }),
    };


    await notifee.displayNotification(
      notification,
    );
  };


const savePushToken =
  async token => {
    if (!token) {
      return;
    }


    const {
      data: {
        session,
      },
    } =
      await supabase.auth
        .getSession();


    if (!session?.user) {
      return;
    }


    const {
      error,
    } =
      await supabase.rpc(
        'register_push_token_secure',
        {
          p_token:
            token,

          p_platform:
            Platform.OS,
        },
      );


    if (error) {
      if (__DEV__) {
        console.error(
          'Push token registration error:',
          error.message,
        );
      }

      return;
    }
  };


const usePushNotifications =
  () => {
    useEffect(() => {
      if (
        ![
          'android',
          'ios',
        ].includes(
          Platform.OS,
        ) ||
        !isPushNotificationsEnabled()
      ) {
        return undefined;
      }


      let messaging;


      try {
        messaging =
          getMessaging();
      } catch (error) {
        if (__DEV__) {
          console.error(
            'Push messaging initialization error:',
            error?.message ||
              error,
          );
        }

        return undefined;
      }


      let unsubscribeTokenRefresh;
      let unsubscribeForegroundMessage;
      let authSubscription;
      let disposed = false;


      const registerToken =
        async () => {
          try {
            const token =
              await getToken(
                messaging,
              );


            await savePushToken(
              token,
            );

          } catch (error) {
            if (__DEV__) {
              console.error(
                'FCM token error:',
                error?.message ||
                  error,
              );
            }
          }
        };


      const setupPushNotifications =
        async () => {
          try {
            const permissionGranted =
              await requestNotificationPermission(
                messaging,
              );


            if (!permissionGranted) {
              if (__DEV__) {
                console.error(
                  'Notification permission not granted',
                );
              }

              return;
            }


            if (disposed) {
              return;
            }


            if (
              Platform.OS ===
              'ios'
            ) {
              await registerDeviceForRemoteMessages(
                messaging,
              );

            } else {
              await createForegroundChannel();
            }


            if (disposed) {
              return;
            }

            await registerToken();


            if (disposed) {
              return;
            }


            unsubscribeForegroundMessage =
              onMessage(
                messaging,
                async remoteMessage => {
                  try {
                    await showForegroundNotification(
                      remoteMessage,
                    );

                  } catch (error) {
                    if (__DEV__) {
                      console.error(
                        'Foreground notification error:',
                        error?.message ||
                          error,
                      );
                    }
                  }
                },
              );


            unsubscribeTokenRefresh =
              onTokenRefresh(
                messaging,
                async newToken => {
                  await savePushToken(
                    newToken,
                  );
                },
              );


            const {
              data: {
                subscription,
              },
            } =
              supabase.auth
                .onAuthStateChange(
                  (
                    event,
                    session,
                  ) => {
                    if (
                      session?.user &&
                      (
                        event ===
                          'SIGNED_IN' ||
                        event ===
                          'INITIAL_SESSION'
                      )
                    ) {
                      setTimeout(
                        () => {
                          registerToken();
                        },
                        0,
                      );
                    }
                  },
                );


            authSubscription =
              subscription;

          } catch (error) {
            if (__DEV__) {
              console.error(
                'Push notification setup error:',
                error?.message ||
                  error,
              );
            }
          }
        };


      setupPushNotifications();


      return () => {
        disposed = true;


        if (
          unsubscribeForegroundMessage
        ) {
          unsubscribeForegroundMessage();
        }


        if (
          unsubscribeTokenRefresh
        ) {
          unsubscribeTokenRefresh();
        }


        if (
          authSubscription
        ) {
          authSubscription.unsubscribe();
        }
      };
    }, []);
  };


export default usePushNotifications;
