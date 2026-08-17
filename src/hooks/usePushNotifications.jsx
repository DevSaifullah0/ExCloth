import { useEffect } from 'react';

import {
  PermissionsAndroid,
  Platform,
} from 'react-native';

import notifee, {
  AndroidImportance,
} from '@notifee/react-native';

import {
  getMessaging,
  getToken,
  onTokenRefresh,
  onMessage,
} from '@react-native-firebase/messaging';

import { supabase } from '../lib/supabase';


const FOREGROUND_CHANNEL_ID =
  'excloth_foreground_v1';


const requestNotificationPermission =
  async () => {
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


    await notifee.displayNotification({
      ...(notificationId
        ? {
            id:
              String(
                notificationId,
              ),
          }
        : {}),

      title:
        remoteMessage
          ?.notification
          ?.title ||
        'ExCloth',

      body:
        remoteMessage
          ?.notification
          ?.body ||
        'You have a new notification.',

      data,

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
    });
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
        Platform.OS !==
        'android'
      ) {
        return undefined;
      }


      const messaging =
        getMessaging();


      let unsubscribeTokenRefresh;
      let unsubscribeForegroundMessage;
      let authSubscription;


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
              await requestNotificationPermission();


            if (!permissionGranted) {
              if (__DEV__) {
                console.error(
                  'Notification permission not granted',
                );
              }

              return;
            }


            await createForegroundChannel();

            await registerToken();


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
