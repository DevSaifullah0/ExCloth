import { createClient } from 'supabase';

type ServiceAccount = {
  project_id: string;
  private_key: string;
  private_key_id?: string;
  client_email: string;
  token_uri?: string;
};

type NotificationRecord = {
  id: string;
  user_id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  order_id?: string | null;
  return_request_id?: string | null;
  coupon_id?: number | null;
  broadcast_id?: string | null;
  data?: Record<string, unknown> | null;
};

type WebhookPayload = {
  type: string;
  table: string;
  schema: string;
  record: NotificationRecord;
  old_record?: NotificationRecord | null;
};

type PreferenceKey =
  | 'order_updates'
  | 'return_updates'
  | 'promotions'
  | 'coupons'
  | 'account_updates';

const encoder = new TextEncoder();

const MAX_WEBHOOK_BYTES = 64 * 1024;

const ALLOWED_CUSTOM_DATA_KEYS = new Set([
  'action',
  'screen',
  'status',
  'slug',
]);

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .split('/')
    .join('_')
    .split('=')
    .join('');
};

const secretsMatch = async (received: string, expected: string) => {
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(received)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);

  const receivedBytes = new Uint8Array(receivedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let matches = true;

  for (let index = 0; index < receivedBytes.length; index += 1) {
    if (receivedBytes[index] !== expectedBytes[index]) {
      matches = false;
    }
  }

  return matches;
};

const preferenceForNotification = (
  notification: NotificationRecord,
): PreferenceKey => {
  const type = String(notification.type || '').toLowerCase();

  if (
    notification.return_request_id ||
    type.includes('return') ||
    type.includes('refund')
  ) {
    return 'return_updates';
  }

  if (
    notification.order_id ||
    type.includes('order') ||
    type.includes('delivery') ||
    type.includes('payment')
  ) {
    return 'order_updates';
  }

  if (
    (notification.coupon_id !== null && notification.coupon_id !== undefined) ||
    type.includes('coupon')
  ) {
    return 'coupons';
  }

  if (
    notification.broadcast_id ||
    type.includes('promotion') ||
    type.includes('offer') ||
    type.includes('broadcast')
  ) {
    return 'promotions';
  }

  return 'account_updates';
};

const pemToArrayBuffer = (pem: string) => {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binary = atob(base64);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
};

const getGoogleAccessToken = async (serviceAccount: ServiceAccount) => {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    ...(serviceAccount.private_key_id
      ? {
          kid: serviceAccount.private_key_id,
        }
      : {}),
  };

  const claims = {
    iss: serviceAccount.client_email,

    scope: 'https://www.googleapis.com/auth/firebase.messaging',

    aud: 'https://oauth2.googleapis.com/token',

    iat: now,

    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));

  const encodedClaims = base64UrlEncode(encoder.encode(JSON.stringify(claims)));

  const unsignedToken = `${encodedHeader}.${encodedClaims}`;

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',

    pemToArrayBuffer(serviceAccount.private_key),

    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },

    false,

    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',

    privateKey,

    encoder.encode(unsignedToken),
  );

  const jwt = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;

  const response = await fetch(
    serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',

    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },

      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',

        assertion: jwt,
      }),
    },
  );

  const result = await response.json();

  if (!response.ok || !result.access_token) {
    console.error('Google OAuth error:', result);

    throw new Error('Firebase access token generate nahi hua.');
  }

  return result.access_token as string;
};

const buildPushData = (notification: NotificationRecord) => {
  const data: Record<string, string> = {
    notification_id: String(notification.id),

    type: notification.type || 'notification',
  };

  if (notification.order_id) {
    data.order_id = String(notification.order_id);
  }

  if (notification.return_request_id) {
    data.return_request_id = String(notification.return_request_id);
  }

  if (notification.coupon_id !== null && notification.coupon_id !== undefined) {
    data.coupon_id = String(notification.coupon_id);
  }

  if (notification.broadcast_id) {
    data.broadcast_id = String(notification.broadcast_id);
  }

  if (notification.data && typeof notification.data === 'object') {
    Object.entries(notification.data).forEach(([key, value]) => {
      if (
        !ALLOWED_CUSTOM_DATA_KEYS.has(key) ||
        value === null ||
        value === undefined
      ) {
        return;
      }

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        data[key] = String(value).slice(0, 512);
      }
    });
  }

  return data;
};

Deno.serve(async req => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse(
        {
          error: 'Method not allowed',
        },
        405,
      );
    }

    const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('PUSH_WEBHOOK_SECRET missing.');
    }

    const receivedSecret = req.headers.get('x-webhook-secret');

    if (
      !receivedSecret ||
      !(await secretsMatch(receivedSecret, webhookSecret))
    ) {
      return jsonResponse(
        {
          error: 'Unauthorized',
        },
        401,
      );
    }

    const declaredLength = Number(req.headers.get('content-length') || 0);

    if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
      return jsonResponse({ error: 'Payload too large' }, 413);
    }

    const rawPayload = await req.text();

    if (encoder.encode(rawPayload).length > MAX_WEBHOOK_BYTES) {
      return jsonResponse({ error: 'Payload too large' }, 413);
    }

    let payload: WebhookPayload;

    try {
      payload = JSON.parse(rawPayload) as WebhookPayload;
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }

    if (
      payload.type !== 'INSERT' ||
      payload.table !== 'notifications' ||
      payload.schema !== 'public'
    ) {
      return jsonResponse({
        success: true,
        skipped: true,
      });
    }

    const notification = payload.record;

    if (
      !notification?.id ||
      !notification?.user_id ||
      String(notification.title || '').length > 120 ||
      String(notification.message || '').length > 1000
    ) {
      return jsonResponse(
        {
          error: 'Invalid notification record',
        },
        400,
      );
    }

    const firebaseSecret = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

    if (!firebaseSecret) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT missing.');
    }

    const serviceAccount = JSON.parse(firebaseSecret) as ServiceAccount;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase server credentials missing.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: preference, error: preferenceError } = await supabase
      .from('user_notification_preferences')
      .select(preferenceForNotification(notification))
      .eq('user_id', notification.user_id)
      .maybeSingle();

    if (preferenceError) {
      throw new Error('Notification preference lookup failed.');
    }

    const preferenceKey = preferenceForNotification(notification);

    if (preference?.[preferenceKey] === false) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: 'preference_disabled',
      });
    }

    const { data: tokens, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', notification.user_id)
      .limit(20);

    if (tokenError) {
      throw new Error(tokenError.message);
    }

    if (!tokens || tokens.length === 0) {
      return jsonResponse({
        success: true,
        sent: 0,
        message: 'User ke paas push token nahi hai.',
      });
    }

    const accessToken = await getGoogleAccessToken(serviceAccount);

    const pushData = buildPushData(notification);

    const settledDeliveries = await Promise.allSettled(
      tokens.map(async item => {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,

          {
            method: 'POST',

            headers: {
              Authorization: `Bearer ${accessToken}`,

              'Content-Type': 'application/json',
            },

            body: JSON.stringify({
              message: {
                token: item.token,

                notification: {
                  title: notification.title || 'ExCloth',

                  body: notification.message || 'You have a new notification.',
                },

                data: pushData,

                android: {
                  priority: 'high',

                  notification: {
                    sound: 'default',

                    channel_id: 'excloth_foreground_v1',
                  },
                },

                apns: {
                  headers: {
                    'apns-priority': '10',
                  },

                  payload: {
                    aps: {
                      sound: 'default',
                    },
                  },
                },
              },
            }),
          },
        );

        const result = await response.json().catch(() => ({}));

        if (response.ok) {
          return {
            sent: true,
            invalidToken: null,
          };
        }

        console.error('FCM delivery failed', response.status);

        const fcmError = result?.error?.details?.find(
          (detail: { errorCode?: string }) => detail?.errorCode,
        );

        return {
          sent: false,
          invalidToken:
            fcmError?.errorCode === 'UNREGISTERED' ? item.token : null,
        };
      }),
    );

    const deliveryResults = settledDeliveries.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      console.error('FCM delivery request failed before a provider response');

      return {
        sent: false,
        invalidToken: null,
      };
    });

    const sent = deliveryResults.filter(result => result.sent).length;
    const failed = deliveryResults.length - sent;
    const invalidTokens = deliveryResults
      .map(result => result.invalidToken)
      .filter((token): token is string => Boolean(token));

    if (invalidTokens.length > 0) {
      const { error: deleteError } = await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', notification.user_id)
        .in('token', invalidTokens);

      if (deleteError) {
        console.error('Invalid push token cleanup failed');
      }
    }

    return jsonResponse(
      {
        success: failed === 0,
        sent,
        failed,
      },
      failed > 0 ? 207 : 200,
    );
  } catch (error) {
    console.error('Push function error:', error);

    return jsonResponse(
      {
        success: false,
        error: 'Push delivery failed',
      },

      500,
    );
  }
});
