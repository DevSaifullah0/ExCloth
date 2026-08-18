require('react-native-gesture-handler/jestSetup');


global.IS_REACT_ACT_ENVIRONMENT =
  true;


jest.mock(
  '@react-native-async-storage/async-storage',
  () => {
    const storage =
      new Map();


    return {
      __esModule: true,
      default: {
        clear:
          jest.fn(async () => {
            storage.clear();
          }),
        getItem:
          jest.fn(async key =>
            storage.has(key)
              ? storage.get(key)
              : null,
          ),
        removeItem:
          jest.fn(async key => {
            storage.delete(key);
          }),
        setItem:
          jest.fn(
            async (
              key,
              value,
            ) => {
              storage.set(
                key,
                value,
              );
            },
          ),
      },
    };
  },
);


jest.mock(
  'react-native-safe-area-context',
  () =>
    require('react-native-safe-area-context/jest/mock').default,
);


jest.mock(
  'react-native-reanimated',
  () =>
    require('react-native-reanimated/mock'),
);


jest.mock(
  '@react-native-vector-icons/ionicons/static',
  () => 'Ionicons',
);


jest.mock(
  'react-native-config',
  () => ({
    SUPABASE_URL:
      'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY:
      'test-publishable-key',
    IOS_PUSH_NOTIFICATIONS_ENABLED:
      'false',
    SUPPORT_EMAIL: '',
    PRIVACY_POLICY_URL: '',
    TERMS_OF_SERVICE_URL: '',
    SHIPPING_POLICY_URL: '',
    RETURN_REFUND_POLICY_URL: '',
  }),
);


jest.mock(
  '../src/lib/supabase',
  () => ({
    supabase: {
      auth: {
        getSession:
          jest.fn().mockResolvedValue({
            data: {
              session: null,
            },
            error: null,
          }),
        onAuthStateChange:
          jest.fn(() => ({
            data: {
              subscription: {
                unsubscribe:
                  jest.fn(),
              },
            },
          })),
        startAutoRefresh:
          jest.fn(),
        stopAutoRefresh:
          jest.fn(),
      },
      rpc:
        jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
    },
  }),
);


jest.mock(
  '@react-native-firebase/messaging',
  () => ({
    AuthorizationStatus: {
      DENIED: 0,
      AUTHORIZED: 1,
      PROVISIONAL: 2,
    },
    getMessaging:
      jest.fn(() => ({})),
    getToken:
      jest.fn().mockResolvedValue(
        'test-push-token',
      ),
    getInitialNotification:
      jest.fn().mockResolvedValue(
        null,
      ),
    hasPermission:
      jest.fn().mockResolvedValue(1),
    onMessage:
      jest.fn(() => jest.fn()),
    onNotificationOpenedApp:
      jest.fn(() => jest.fn()),
    onTokenRefresh:
      jest.fn(() => jest.fn()),
    registerDeviceForRemoteMessages:
      jest.fn().mockResolvedValue(
        undefined,
      ),
    requestPermission:
      jest.fn().mockResolvedValue(1),
  }),
);


jest.mock(
  '@notifee/react-native',
  () => ({
    __esModule: true,
    default: {
      createChannel:
        jest.fn().mockResolvedValue(
          'test-channel',
        ),
      displayNotification:
        jest.fn().mockResolvedValue(
          undefined,
        ),
      getInitialNotification:
        jest.fn().mockResolvedValue(
          null,
        ),
      onBackgroundEvent:
        jest.fn(),
      onForegroundEvent:
        jest.fn(() => jest.fn()),
    },
    AndroidImportance: {
      HIGH: 4,
    },
    EventType: {
      PRESS: 1,
    },
  }),
);
