import {
  buildCheckoutFingerprint,
  buildCreateOrderRequest,
  createOrderIdempotencyKey,
  createOrderIntentRecord,
  getProductionGatewayConfig,
  isReusableOrderIntent,
  isValidOrderIdempotencyKey,
  resolveOnlinePaymentAvailability,
} from '../src/utils/paymentOrder';


const configuredGateway = {
  PAYMENT_GATEWAY_ENABLED:
    'true',
  PAYMENT_GATEWAY_PROVIDER:
    'example-provider',
  PAYMENT_GATEWAY_ADAPTER:
    'native-sdk-v1',
};


describe(
  'payment order helpers',
  () => {
    test(
      'requires an explicit complete production gateway configuration',
      () => {
        expect(
          getProductionGatewayConfig({
            PAYMENT_GATEWAY_ENABLED:
              'true',
            PAYMENT_GATEWAY_PROVIDER:
              'example-provider',
          }).configured,
        ).toBe(false);

        expect(
          getProductionGatewayConfig(
            configuredGateway,
          ),
        ).toEqual({
          enabled: true,
          provider:
            'example-provider',
          adapter:
            'native-sdk-v1',
          configured: true,
        });
      },
    );

    test(
      'allows the demo only in development',
      () => {
        expect(
          resolveOnlinePaymentAvailability({
            isDev: true,
          }),
        ).toMatchObject({
          allowed: true,
          mode: 'demo',
        });

        expect(
          resolveOnlinePaymentAvailability({
            isDev: false,
          }),
        ).toMatchObject({
          allowed: false,
          mode: null,
        });
      },
    );

    test(
      'fails closed when config exists but no provider adapter is installed',
      () => {
        expect(
          resolveOnlinePaymentAvailability({
            isDev: false,
            runtimeConfig:
              configuredGateway,
            hasProviderAdapter:
              false,
          }),
        ).toMatchObject({
          allowed: false,
          mode: null,
          provider:
            'example-provider',
        });

        expect(
          resolveOnlinePaymentAvailability({
            isDev: false,
            runtimeConfig:
              configuredGateway,
            hasProviderAdapter:
              true,
          }),
        ).toMatchObject({
          allowed: true,
          mode: 'production',
          provider:
            'example-provider',
        });
      },
    );

    test(
      'builds a stable checkout fingerprint independent of cart order',
      () => {
        const checkout = {
          userId: 'user-1',
          shippingAddressId:
            'address-1',
          couponCode: ' save10 ',
          cartItems: [
            {
              cartId: 'cart-2',
              productId:
                'product-2',
              variantId:
                'variant-2',
              quantity: 1,
            },
            {
              cartId: 'cart-1',
              productId:
                'product-1',
              variantId:
                'variant-1',
              quantity: 2,
            },
          ],
        };

        const reversedCheckout = {
          ...checkout,
          cartItems: [
            ...checkout.cartItems,
          ].reverse(),
        };

        expect(
          buildCheckoutFingerprint(
            checkout,
          ),
        ).toBe(
          buildCheckoutFingerprint(
            reversedCheckout,
          ),
        );

        expect(
          buildCheckoutFingerprint(
            checkout,
          ),
        ).not.toBe(
          buildCheckoutFingerprint({
            ...checkout,
            cartItems: [
              {
                ...checkout
                  .cartItems[0],
                quantity: 3,
              },
              checkout
                .cartItems[1],
            ],
          }),
        );
      },
    );

    test(
      'creates a valid deterministic key with injected entropy',
      () => {
        const key =
          createOrderIdempotencyKey({
            now: () =>
              1700000000000,
            randomUUID: () =>
              '123e4567-e89b-12d3-a456-426614174000',
          });

        expect(key).toBe(
          'ord_loyw3v28_123e4567-e89b-12d3-a456-426614174000',
        );

        expect(
          isValidOrderIdempotencyKey(
            key,
          ),
        ).toBe(true);
      },
    );

    test(
      'sends the same key in the create-order header and body',
      () => {
        const idempotencyKey =
          'ord_loyw3v28_123e4567-e89b-12d3-a456-426614174000';

        expect(
          buildCreateOrderRequest({
            idempotencyKey,
            body: {
              payment_method:
                'cod',
            },
          }),
        ).toEqual({
          headers: {
            'Idempotency-Key':
              idempotencyKey,
          },
          body: {
            payment_method:
              'cod',
            idempotency_key:
              idempotencyKey,
          },
        });

        expect(() =>
          buildCreateOrderRequest({
            idempotencyKey:
              'invalid',
          }),
        ).toThrow(
          'A valid order idempotency key is required.',
        );
      },
    );

    test(
      'reuses an intent only for the same checkout within its lifetime',
      () => {
        const intent =
          createOrderIntentRecord({
            fingerprint:
              'checkout-a',
            idempotencyKey:
              'ord_loyw3v28_123e4567-e89b-12d3-a456-426614174000',
            createdAt: 1000,
          });

        expect(
          isReusableOrderIntent(
            intent,
            {
              fingerprint:
                'checkout-a',
              now: 2000,
              ttlMs: 5000,
            },
          ),
        ).toBe(true);

        expect(
          isReusableOrderIntent(
            intent,
            {
              fingerprint:
                'checkout-b',
              now: 2000,
              ttlMs: 5000,
            },
          ),
        ).toBe(false);

        expect(
          isReusableOrderIntent(
            intent,
            {
              fingerprint:
                'checkout-a',
              now: 7000,
              ttlMs: 5000,
            },
          ),
        ).toBe(false);
      },
    );
  },
);
