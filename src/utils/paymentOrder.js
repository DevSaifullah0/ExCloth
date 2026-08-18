/* global globalThis */

const ORDER_INTENT_VERSION = 1;

// This must only become true when a real, reviewed provider adapter is
// implemented in the app. Environment variables alone cannot turn the
// existing demo flow into a production payment integration.
export const PRODUCTION_PAYMENT_ADAPTER_AVAILABLE =
  false;

export const ORDER_INTENT_TTL_MS =
  24 * 60 * 60 * 1000;

export const ONLINE_PAYMENT_METHOD_CODES =
  Object.freeze([
    'card',
    'easypaisa',
    'jazzcash',
    'bank_transfer',
  ]);

const normalizeConfigValue = value =>
  String(value || '')
    .trim()
    .toLowerCase();

const normalizeFingerprintValue = value => {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value).trim();
};

export const getProductionGatewayConfig = (
  runtimeConfig = {},
) => {
  const enabled =
    normalizeConfigValue(
      runtimeConfig
        .PAYMENT_GATEWAY_ENABLED,
    ) === 'true';

  const provider =
    normalizeConfigValue(
      runtimeConfig
        .PAYMENT_GATEWAY_PROVIDER,
    );

  const adapter =
    normalizeConfigValue(
      runtimeConfig
        .PAYMENT_GATEWAY_ADAPTER,
    );

  return {
    enabled,
    provider,
    adapter,
    configured:
      enabled &&
      Boolean(provider) &&
      Boolean(adapter),
  };
};

export const resolveOnlinePaymentAvailability = ({
  isDev = false,
  runtimeConfig = {},
  hasProviderAdapter = false,
} = {}) => {
  if (isDev === true) {
    return {
      allowed: true,
      mode: 'demo',
      reason: null,
      provider: 'demo',
    };
  }

  const gatewayConfig =
    getProductionGatewayConfig(
      runtimeConfig,
    );

  if (!gatewayConfig.configured) {
    return {
      allowed: false,
      mode: null,
      reason:
        'Production online payments are not configured.',
      provider:
        gatewayConfig.provider || null,
    };
  }

  if (!hasProviderAdapter) {
    return {
      allowed: false,
      mode: null,
      reason:
        'The configured production payment provider adapter is not installed.',
      provider: gatewayConfig.provider,
    };
  }

  return {
    allowed: true,
    mode: 'production',
    reason: null,
    provider: gatewayConfig.provider,
  };
};

export const buildCheckoutFingerprint = ({
  userId,
  shippingAddressId,
  couponCode,
  cartItems = [],
}) => {
  const normalizedItems =
    (Array.isArray(cartItems)
      ? cartItems
      : [])
      .map(item => ({
        cartId:
          normalizeFingerprintValue(
            item?.cartId || item?.id,
          ),
        productId:
          normalizeFingerprintValue(
            item?.productId ||
              item?.product_id ||
              item?.product?.id,
          ),
        variantId:
          normalizeFingerprintValue(
            item?.variantId ||
              item?.variant_id ||
              item?.variant?.id,
          ),
        quantity: Number.isFinite(
          Number(item?.quantity),
        )
          ? Math.max(
              Number(item.quantity),
              0,
            )
          : 0,
      }))
      .sort((first, second) =>
        JSON.stringify(first).localeCompare(
          JSON.stringify(second),
        ),
      );

  return JSON.stringify({
    userId:
      normalizeFingerprintValue(userId),
    shippingAddressId:
      normalizeFingerprintValue(
        shippingAddressId,
      ),
    couponCode:
      normalizeFingerprintValue(
        couponCode,
      ).toUpperCase(),
    cartItems: normalizedItems,
  });
};

const getRandomUuid = () => {
  const cryptoObject =
    globalThis?.crypto;

  if (
    typeof cryptoObject?.randomUUID ===
    'function'
  ) {
    return cryptoObject.randomUUID();
  }

  return null;
};

export const createOrderIdempotencyKey = ({
  now = () => Date.now(),
  randomUUID = getRandomUuid,
  random = () => Math.random(),
} = {}) => {
  const timestamp = Number(now());
  const uuid = randomUUID?.();

  const entropy = uuid
    ? String(uuid).replace(
        /[^a-zA-Z0-9_-]/g,
        '',
      )
    : [random(), random(), random()]
        .map(value =>
          Number(value)
            .toString(36)
            .slice(2),
        )
        .join('');

  return `ord_${timestamp.toString(
    36,
  )}_${entropy}`.slice(0, 120);
};

export const isValidOrderIdempotencyKey =
  value =>
    /^ord_[a-zA-Z0-9_-]{12,116}$/.test(
      String(value || ''),
    );

export const createOrderIntentRecord = ({
  fingerprint,
  idempotencyKey,
  createdAt,
}) => ({
  version: ORDER_INTENT_VERSION,
  fingerprint:
    String(fingerprint || ''),
  idempotencyKey,
  createdAt: Number(createdAt),
});

export const isReusableOrderIntent = (
  intent,
  {
    fingerprint,
    now = Date.now(),
    ttlMs = ORDER_INTENT_TTL_MS,
    requireFingerprint = true,
  } = {},
) => {
  if (
    !intent ||
    intent.version !==
      ORDER_INTENT_VERSION ||
    !isValidOrderIdempotencyKey(
      intent.idempotencyKey,
    ) ||
    !Number.isFinite(
      Number(intent.createdAt),
    )
  ) {
    return false;
  }

  const age =
    Number(now) -
    Number(intent.createdAt);

  if (
    age < 0 ||
    age > ttlMs
  ) {
    return false;
  }

  if (!requireFingerprint) {
    return true;
  }

  return (
    intent.fingerprint ===
    String(fingerprint || '')
  );
};

export const buildCreateOrderRequest = ({
  idempotencyKey,
  body,
}) => {
  if (
    !isValidOrderIdempotencyKey(
      idempotencyKey,
    )
  ) {
    throw new Error(
      'A valid order idempotency key is required.',
    );
  }

  return {
    headers: {
      'Idempotency-Key':
        idempotencyKey,
    },
    body: {
      ...(body || {}),
      idempotency_key:
        idempotencyKey,
    },
  };
};
