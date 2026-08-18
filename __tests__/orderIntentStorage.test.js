import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearOrderIntent,
  getActiveOrderIntent,
  getOrCreateOrderIntent,
} from '../src/utils/orderIntentStorage';


jest.mock(
  '@react-native-async-storage/async-storage',
  () => {
    const storage =
      new Map();

    return {
      __esModule: true,
      default: {
        getItem:
          jest.fn(async key =>
            storage.has(key)
              ? storage.get(key)
              : null,
          ),
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
        removeItem:
          jest.fn(
            async key => {
              storage.delete(
                key,
              );
            },
          ),
        clear:
          jest.fn(
            async () => {
              storage.clear();
            },
          ),
      },
    };
  },
);


describe(
  'order intent storage',
  () => {
    beforeEach(
      async () => {
        await AsyncStorage.clear();
      },
    );

    test(
      'reuses the persisted key for the same checkout retry',
      async () => {
        const firstIntent =
          await getOrCreateOrderIntent({
            userId: 'user-1',
            fingerprint:
              'checkout-1',
          });

        const retriedIntent =
          await getOrCreateOrderIntent({
            userId: 'user-1',
            fingerprint:
              'checkout-1',
          });

        expect(
          retriedIntent,
        ).toEqual(
          firstIntent,
        );

        expect(
          await getActiveOrderIntent(
            'user-1',
          ),
        ).toEqual(
          firstIntent,
        );
      },
    );

    test(
      'rotates the key when checkout contents change',
      async () => {
        const firstIntent =
          await getOrCreateOrderIntent({
            userId: 'user-1',
            fingerprint:
              'checkout-1',
          });

        const changedIntent =
          await getOrCreateOrderIntent({
            userId: 'user-1',
            fingerprint:
              'checkout-2',
          });

        expect(
          changedIntent
            .idempotencyKey,
        ).not.toBe(
          firstIntent
            .idempotencyKey,
        );
      },
    );

    test(
      'clears only the matching completed order intent',
      async () => {
        const intent =
          await getOrCreateOrderIntent({
            userId: 'user-1',
            fingerprint:
              'checkout-1',
          });

        expect(
          await clearOrderIntent({
            userId: 'user-1',
            idempotencyKey:
              'ord_wrong-attempt-key',
          }),
        ).toBe(false);

        expect(
          await getActiveOrderIntent(
            'user-1',
          ),
        ).toEqual(intent);

        expect(
          await clearOrderIntent({
            userId: 'user-1',
            idempotencyKey:
              intent.idempotencyKey,
          }),
        ).toBe(true);

        expect(
          await getActiveOrderIntent(
            'user-1',
          ),
        ).toBeNull();
      },
    );
  },
);
