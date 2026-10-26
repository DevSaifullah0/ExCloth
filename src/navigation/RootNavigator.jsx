import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons/static';

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
import AppModal from '../components/common/AppModal';

import { useAuth } from '../context/AuthContext';

import {
  consumeNotificationPress,
  createRemoteMessageFromNotification,
} from '../services/notificationPressStore';

import {
  isPushNotificationsEnabled,
} from '../utils/pushConfig';
import useInternetConnection from '../hooks/useInternetConnection';


const navigationRef =
  createNavigationContainerRef();


const RootNavigator = () => {
  const [splashCompleted, setSplashCompleted] = useState(false);
  const {
    session,
    loading,
    roleLoading,
    isAdmin,
    accountCreatedNoticeVisible,
    dismissAccountCreatedNotice,
  } = useAuth();

  const { isConnected, checking, retryConnection } = useInternetConnection();

  useEffect(() => {
    const splashTimer = setTimeout(() => setSplashCompleted(true), 1200);
    return () => clearTimeout(splashTimer);
  }, []);

  const sessionRef =
    useRef(session);

  const isAdminRef =
    useRef(isAdmin);

  const loadingRef =
    useRef(loading);

  const roleLoadingRef =
    useRef(roleLoading);

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

    roleLoadingRef.current =
      roleLoading;


    if (loading || !isConnected) {
      navigationReadyRef.current =
        false;

      return;
    }


    if (
      session &&
      !roleLoading &&
      isConnected &&
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
    roleLoading,
    isConnected,
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
        roleLoadingRef.current ||
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
          navigationRef.navigate('AdminDashboard', {
            screen: 'Returns',
            params: {
              screen: 'AdminReturnDetails',
              params: {
                returnRequestId: data.return_request_id,
              },
            },
          });

          return;
        }


        if (data.order_id) {
          navigationRef.navigate('AdminDashboard', {
            screen: 'Orders',
            params: {
              screen: 'AdminOrderDetails',
              params: {
                orderId: data.order_id,
              },
            },
          });

          return;
        }

        if (data.screen === 'AdminProducts' || data.type === 'low_stock') {
          navigationRef.navigate('AdminDashboard', {
            screen: 'Products',
          });
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

      if (data.product_id) {
        navigationRef.navigate('ProductDetails', {
          product: {
            id: Number(data.product_id),
            slug: data.slug || null,
          },
        });
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


  if (!splashCompleted || loading) {
    return <SplashScreen />;
  }

  if (isConnected === null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <ActivityIndicator size="large" color="black" />
        </View>
        <Text className="mt-4 font-semibold text-gray-600">Checking internet connection...</Text>
      </SafeAreaView>
    );
  }

  if (!isConnected) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-7">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-gray-100">
          <Ionicons name="cloud-offline-outline" size={38} color="#DC2626" />
        </View>
        <Text className="mt-6 text-2xl font-extrabold text-black">Connection error</Text>
        <Text className="mt-2 text-center leading-6 text-gray-500">
          Internet connection nahi mil raha. Wi-Fi ya mobile data check karke dobara try karein.
        </Text>
        <TouchableOpacity
          onPress={retryConnection}
          disabled={checking}
          accessibilityRole="button"
          className="mt-6 h-12 min-w-40 flex-row items-center justify-center rounded-2xl bg-black px-6"
        >
          {checking ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">Retry connection</Text>}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
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
    <AppModal
      visible={accountCreatedNoticeVisible}
      type="success"
      title="Account Created Successfully"
      message="Your account has been created successfully."
      confirmText="Continue"
      onConfirm={dismissAccountCreatedNotice}
      onCancel={dismissAccountCreatedNotice}
    />
    </>
  );
};


export default RootNavigator;
