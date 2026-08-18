import React, {
  useEffect,
  useRef,
} from 'react';

import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';

import notifee, {
  EventType,
} from '@notifee/react-native';

import SplashScreen from '../screens/splash/SplashScreen';

import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import AdminNavigator from './AdminNavigator';

import { useAuth } from '../context/AuthContext';

import {
  consumeNotificationPress,
  createRemoteMessageFromNotification,
} from '../services/notificationPressStore';

import {
  isPushNotificationsEnabled,
} from '../utils/pushConfig';


const navigationRef =
  createNavigationContainerRef();


const RootNavigator = () => {
  const {
    session,
    loading,
    isAdmin,
  } = useAuth();

  const sessionRef =
    useRef(session);

  const isAdminRef =
    useRef(isAdmin);

  const loadingRef =
    useRef(loading);

  const navigationReadyRef =
    useRef(false);

  const pendingNotificationRef =
    useRef(null);

  const initialNotificationCheckedRef =
    useRef(false);

  const handledNotificationIdRef =
    useRef(null);


  useEffect(() => {
    sessionRef.current =
      session;

    isAdminRef.current =
      isAdmin;

    loadingRef.current =
      loading;


    if (loading) {
      navigationReadyRef.current =
        false;

      return;
    }


    if (
      session &&
      navigationReadyRef.current &&
      pendingNotificationRef.current
    ) {
      const pendingNotification =
        pendingNotificationRef.current;

      pendingNotificationRef.current =
        null;


      setTimeout(() => {
        handleNotificationPress(
          pendingNotification,
        );
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session,
    isAdmin,
    loading,
  ]);


  const createNotificationObject =
    remoteMessage => {
      const data =
        remoteMessage?.data || {};

      return {
        id:
          data.notification_id ||
          remoteMessage?.messageId ||
          null,

        type:
          data.type ||
          'notification',

        title:
          remoteMessage?.notification
            ?.title ||
          'ExCloth',

        message:
          remoteMessage?.notification
            ?.body ||
          'You have a new notification.',

        order_id:
          data.order_id ||
          null,

        return_request_id:
          data.return_request_id ||
          null,

        coupon_id:
          data.coupon_id ||
          null,

        broadcast_id:
          data.broadcast_id ||
          null,

        created_at:
          remoteMessage?.sentTime
            ? new Date(
                remoteMessage.sentTime,
              ).toISOString()
            : new Date().toISOString(),

        is_read: false,

        data,
      };
    };


  const handleNotificationPress =
    remoteMessage => {
      if (!remoteMessage) {
        return;
      }


      if (
        loadingRef.current ||
        !sessionRef.current ||
        !navigationReadyRef.current ||
        !navigationRef.isReady()
      ) {
        pendingNotificationRef.current =
          remoteMessage;

        return;
      }


      const data =
        remoteMessage.data || {};

      const notificationId =
        data.notification_id ||
        remoteMessage.messageId ||
        null;


      if (
        notificationId &&
        handledNotificationIdRef.current ===
          notificationId
      ) {
        return;
      }


      if (notificationId) {
        handledNotificationIdRef.current =
          notificationId;
      }

      if (isAdminRef.current) {
        if (
          data.return_request_id
        ) {
          navigationRef.navigate(
            'AdminReturnDetails',
            {
              returnRequestId:
                data.return_request_id,
            },
          );

          return;
        }


        if (data.order_id) {
          navigationRef.navigate(
            'AdminOrderDetails',
            {
              orderId:
                data.order_id,
            },
          );

          return;
        }

        navigationRef.navigate(
          'AdminDashboard',
        );

        return;
      }


      if (
        data.return_request_id
      ) {
        navigationRef.navigate(
          'ReturnDetails',
          {
            returnRequestId:
              data.return_request_id,
          },
        );

        return;
      }


      if (data.order_id) {
        navigationRef.navigate(
          'OrderDetails',
          {
            orderId:
              data.order_id,
          },
        );

        return;
      }

      const notification =
        createNotificationObject(
          remoteMessage,
        );


      navigationRef.navigate(
        'NotificationDetails',
        {
          notification,
        },
      );
    };


  useEffect(() => {
    if (
      !isPushNotificationsEnabled()
    ) {
      return undefined;
    }


    const unsubscribeForegroundEvent =
      notifee.onForegroundEvent(
        ({
          type,
          detail,
        }) => {
          if (
            type !==
            EventType.PRESS
          ) {
            return;
          }


          const notification =
            detail?.notification;


          if (!notification) {
            return;
          }


          const remoteMessage =
            createRemoteMessageFromNotification(
              notification,
            );


          handleNotificationPress(
            remoteMessage,
          );
        },
      );


    const checkPendingNotification =
      async () => {
        if (
          initialNotificationCheckedRef.current
        ) {
          return;
        }


        initialNotificationCheckedRef.current =
          true;


        try {
          const storedRemoteMessage =
            await consumeNotificationPress();


          if (storedRemoteMessage) {
            handleNotificationPress(
              storedRemoteMessage,
            );
          }


          const initialNotification =
            await notifee.getInitialNotification();


          const initialRemoteMessage =
            createRemoteMessageFromNotification(
              initialNotification
                ?.notification,
            );


          if (initialRemoteMessage) {
            handleNotificationPress(
              initialRemoteMessage,
            );
          }

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Pending notification error:',
              error?.message || error,
            );
          }
        }
      };


    checkPendingNotification();


    return () => {
      unsubscribeForegroundEvent();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (loading) {
    return <SplashScreen />;
  }


  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        navigationReadyRef.current =
          true;


        if (
          sessionRef.current &&
          pendingNotificationRef.current
        ) {
          const pendingNotification =
            pendingNotificationRef.current;

          pendingNotificationRef.current =
            null;


          setTimeout(() => {
            handleNotificationPress(
              pendingNotification,
            );
          }, 0);
        }
      }}
    >
      {!session ? (
        <AuthNavigator />
      ) : isAdmin ? (
        <AdminNavigator
          key="admin"
        />
      ) : (
        <AppNavigator
          key="customer"
        />
      )}
    </NavigationContainer>
  );
};


export default RootNavigator;
