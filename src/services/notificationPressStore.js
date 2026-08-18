import AsyncStorage from '@react-native-async-storage/async-storage';


const PENDING_PRESS_KEY =
  '@excloth/notification-pending-press-v1';

const DATA_KEYS = [
  'notification_id',
  'type',
  'order_id',
  'return_request_id',
  'coupon_id',
  'broadcast_id',
];

const MAX_VALUE_LENGTH =
  256;


const sanitizeValue =
  value => {
    if (
      typeof value !==
        'string' &&
      typeof value !==
        'number'
    ) {
      return null;
    }


    const normalized =
      String(value)
        .trim()
        .slice(
          0,
          MAX_VALUE_LENGTH,
        );


    return normalized ||
      null;
  };


export const sanitizeNotificationData =
  data =>
    DATA_KEYS.reduce(
      (
        result,
        key,
      ) => {
        const value =
          sanitizeValue(
            data?.[key],
          );


        if (value) {
          result[key] =
            value;
        }


        return result;
      },
      {},
    );


export const createRemoteMessageFromNotification =
  notification => {
    if (!notification) {
      return null;
    }


    const data =
      sanitizeNotificationData(
        notification.data,
      );


    return {
      messageId:
        sanitizeValue(
          notification.id,
        ) ||
        data.notification_id ||
        null,

      notification: {
        title:
          sanitizeValue(
            notification.title,
          ) ||
          'ExCloth',

        body:
          sanitizeValue(
            notification.body,
          ) ||
          'You have a new notification.',
      },

      data,
    };
  };


export const persistNotificationPress =
  async notification => {
    const remoteMessage =
      createRemoteMessageFromNotification(
        notification,
      );


    if (!remoteMessage) {
      return false;
    }


    await AsyncStorage.setItem(
      PENDING_PRESS_KEY,
      JSON.stringify(
        remoteMessage,
      ),
    );


    return true;
  };


export const consumeNotificationPress =
  async () => {
    const stored =
      await AsyncStorage.getItem(
        PENDING_PRESS_KEY,
      );


    if (!stored) {
      return null;
    }


    await AsyncStorage.removeItem(
      PENDING_PRESS_KEY,
    );


    try {
      const parsed =
        JSON.parse(stored);


      return {
        messageId:
          sanitizeValue(
            parsed?.messageId,
          ),

        notification: {
          title:
            sanitizeValue(
              parsed?.notification
                ?.title,
            ) ||
            'ExCloth',

          body:
            sanitizeValue(
              parsed?.notification
                ?.body,
            ) ||
            'You have a new notification.',
        },

        data:
          sanitizeNotificationData(
            parsed?.data,
          ),
      };
    } catch {
      return null;
    }
  };
