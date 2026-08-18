import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createOrderIdempotencyKey,
  createOrderIntentRecord,
  isReusableOrderIntent,
  isValidOrderIdempotencyKey,
} from './paymentOrder';

const STORAGE_PREFIX =
  '@excloth/order-intent/v1';

const pendingOperations =
  new Map();

const getStorageKey = userId => {
  const normalizedUserId =
    String(userId || '').trim();

  if (!normalizedUserId) {
    throw new Error(
      'A user is required to prepare an order.',
    );
  }

  return `${STORAGE_PREFIX}/${normalizedUserId}`;
};

const readStoredIntent = async userId => {
  const storageKey =
    getStorageKey(userId);

  const rawValue =
    await AsyncStorage.getItem(
      storageKey,
    );

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    await AsyncStorage.removeItem(
      storageKey,
    );

    return null;
  }
};

const runSerialized = (
  userId,
  operation,
) => {
  const operationKey =
    String(userId || '');

  const previous =
    pendingOperations.get(
      operationKey,
    ) || Promise.resolve();

  const current = previous
    .catch(() => undefined)
    .then(operation);

  pendingOperations.set(
    operationKey,
    current,
  );

  return current.finally(() => {
    if (
      pendingOperations.get(
        operationKey,
      ) === current
    ) {
      pendingOperations.delete(
        operationKey,
      );
    }
  });
};

export const getActiveOrderIntent =
  async userId => {
    const storageKey =
      getStorageKey(userId);

    const intent =
      await readStoredIntent(userId);

    if (
      intent &&
      isReusableOrderIntent(
        intent,
        {
          requireFingerprint:
            false,
        },
      )
    ) {
      return intent;
    }

    if (intent) {
      await AsyncStorage.removeItem(
        storageKey,
      );
    }

    return null;
  };

export const getOrCreateOrderIntent = ({
  userId,
  fingerprint,
  preferredIdempotencyKey = null,
}) =>
  runSerialized(
    userId,
    async () => {
      const storageKey =
        getStorageKey(userId);

      const existingIntent =
        await readStoredIntent(
          userId,
        );

      if (
        isReusableOrderIntent(
          existingIntent,
          {
            fingerprint,
          },
        )
      ) {
        return existingIntent;
      }

      const idempotencyKey =
        isValidOrderIdempotencyKey(
          preferredIdempotencyKey,
        )
          ? preferredIdempotencyKey
          : createOrderIdempotencyKey();

      const intent =
        createOrderIntentRecord({
          fingerprint,
          idempotencyKey,
          createdAt: Date.now(),
        });

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(intent),
      );

      return intent;
    },
  );

export const clearOrderIntent = ({
  userId,
  idempotencyKey,
}) =>
  runSerialized(
    userId,
    async () => {
      const intent =
        await readStoredIntent(
          userId,
        );

      if (
        !intent ||
        intent.idempotencyKey !==
          idempotencyKey
      ) {
        return false;
      }

      await AsyncStorage.removeItem(
        getStorageKey(userId),
      );

      return true;
    },
  );
