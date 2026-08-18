import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  consumeNotificationPress,
  createRemoteMessageFromNotification,
  persistNotificationPress,
  sanitizeNotificationData,
} from '../src/services/notificationPressStore';


describe('notification press storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });


  it('keeps only supported routing fields', () => {
    expect(
      sanitizeNotificationData({
        type: 'order_update',
        order_id: 'order-1',
        route: 'AdminUsers',
        user_id: 'another-user',
        nested: {
          unsafe: true,
        },
      }),
    ).toEqual({
      type: 'order_update',
      order_id: 'order-1',
    });
  });


  it('normalizes a Notifee notification', () => {
    expect(
      createRemoteMessageFromNotification({
        id: 123,
        title: 'Order update',
        body: 'Your order moved.',
        data: {
          notification_id:
            'notification-1',
          order_id: 'order-1',
        },
      }),
    ).toEqual({
      messageId: '123',
      notification: {
        title: 'Order update',
        body: 'Your order moved.',
      },
      data: {
        notification_id:
          'notification-1',
        order_id: 'order-1',
      },
    });
  });


  it('consumes a persisted press only once', async () => {
    await expect(
      persistNotificationPress({
        id: 'message-1',
        data: {
          type: 'return_update',
          return_request_id:
            'return-1',
        },
      }),
    ).resolves.toBe(true);


    await expect(
      consumeNotificationPress(),
    ).resolves.toMatchObject({
      messageId: 'message-1',
      data: {
        type: 'return_update',
        return_request_id:
          'return-1',
      },
    });


    await expect(
      consumeNotificationPress(),
    ).resolves.toBeNull();
  });
});
