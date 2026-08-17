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

const encoder = new TextEncoder();

const jsonResponse = (
  body: unknown,
  status = 200,
) => {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
};

const base64UrlEncode = (
  bytes: Uint8Array,
) => {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const pemToArrayBuffer = (
  pem: string,
) => {
  const base64 = pem
    .replace(
      /-----BEGIN PRIVATE KEY-----/g,
      '',
    )
    .replace(
      /-----END PRIVATE KEY-----/g,
      '',
    )
    .replace(/\s/g, '');

  const binary = atob(base64);

  const bytes = new Uint8Array(
    binary.length,
  );

  for (
    let i = 0;
    i < binary.length;
    i += 1
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes.buffer;
};

const getGoogleAccessToken = async (
  serviceAccount: ServiceAccount,
) => {
  const now = Math.floor(
    Date.now() / 1000,
  );

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    ...(serviceAccount.private_key_id
      ? {
          kid:
            serviceAccount.private_key_id,
        }
      : {}),
  };

  const claims = {
    iss: serviceAccount.client_email,

    scope:
      'https://www.googleapis.com/auth/firebase.messaging',

    aud:
      'https://oauth2.googleapis.com/token',

    iat: now,

    exp: now + 3600,
  };

  const encodedHeader =
    base64UrlEncode(
      encoder.encode(
        JSON.stringify(header),
      ),
    );

  const encodedClaims =
    base64UrlEncode(
      encoder.encode(
        JSON.stringify(claims),
      ),
    );

  const unsignedToken =
    `${encodedHeader}.${encodedClaims}`;

  const privateKey =
    await crypto.subtle.importKey(
      'pkcs8',

      pemToArrayBuffer(
        serviceAccount.private_key,
      ),

      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },

      false,

      ['sign'],
    );

  const signature =
    await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',

      privateKey,

      encoder.encode(
        unsignedToken,
      ),
    );

  const jwt =
    `${unsignedToken}.${base64UrlEncode(
      new Uint8Array(signature),
    )}`;

  const response = await fetch(
    serviceAccount.token_uri ||
      'https://oauth2.googleapis.com/token',

    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },

      body: new URLSearchParams({
        grant_type:
          'urn:ietf:params:oauth:grant-type:jwt-bearer',

        assertion: jwt,
      }),
    },
  );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.access_token
  ) {
    console.error(
      'Google OAuth error:',
      result,
    );

    throw new Error(
      'Firebase access token generate nahi hua.',
    );
  }

  return result.access_token as string;
};

const buildPushData = (
  notification: NotificationRecord,
) => {
  const data: Record<string, string> = {
    notification_id:
      String(notification.id),

    type:
      notification.type ||
      'notification',
  };

  if (notification.order_id) {
    data.order_id =
      String(notification.order_id);
  }

  if (
    notification.return_request_id
  ) {
    data.return_request_id =
      String(
        notification.return_request_id,
      );
  }

  if (
    notification.coupon_id !== null &&
    notification.coupon_id !== undefined
  ) {
    data.coupon_id =
      String(notification.coupon_id);
  }

  if (
    notification.broadcast_id
  ) {
    data.broadcast_id =
      String(
        notification.broadcast_id,
      );
  }

  if (
    notification.data &&
    typeof notification.data ===
      'object'
  ) {
    Object.entries(
      notification.data,
    ).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined
      ) {
        return;
      }

      if (
        typeof value === 'object'
      ) {
        data[key] =
          JSON.stringify(value);
      } else {
        data[key] =
          String(value);
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
          error:
            'Method not allowed',
        },
        405,
      );
    }

    const webhookSecret =
      Deno.env.get(
        'PUSH_WEBHOOK_SECRET',
      );

    if (!webhookSecret) {
      throw new Error(
        'PUSH_WEBHOOK_SECRET missing.',
      );
    }

    const receivedSecret =
      req.headers.get(
        'x-webhook-secret',
      );

    if (
      receivedSecret !==
      webhookSecret
    ) {
      return jsonResponse(
        {
          error: 'Unauthorized',
        },
        401,
      );
    }

    const payload =
      (await req.json()) as WebhookPayload;

    if (
      payload.type !== 'INSERT' ||
      payload.table !==
        'notifications' ||
      payload.schema !== 'public'
    ) {
      return jsonResponse({
        success: true,
        skipped: true,
      });
    }

    const notification =
      payload.record;

    if (
      !notification?.id ||
      !notification?.user_id
    ) {
      return jsonResponse(
        {
          error:
            'Invalid notification record',
        },
        400,
      );
    }

    const firebaseSecret =
      Deno.env.get(
        'FIREBASE_SERVICE_ACCOUNT',
      );

    if (!firebaseSecret) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT missing.',
      );
    }

    const serviceAccount =
      JSON.parse(
        firebaseSecret,
      ) as ServiceAccount;

    const supabaseUrl =
      Deno.env.get(
        'SUPABASE_URL',
      );

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        'Supabase server credentials missing.',
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

    const {
      data: tokens,
      error: tokenError,
    } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq(
        'user_id',
        notification.user_id,
      );

    if (tokenError) {
      throw new Error(
        tokenError.message,
      );
    }

    if (
      !tokens ||
      tokens.length === 0
    ) {
      return jsonResponse({
        success: true,
        sent: 0,
        message:
          'User ke paas push token nahi hai.',
      });
    }

    const accessToken =
      await getGoogleAccessToken(
        serviceAccount,
      );

    const pushData =
      buildPushData(
        notification,
      );

    let sent = 0;
    let failed = 0;

    for (const item of tokens) {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,

        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            message: {
              token: item.token,

              notification: {
                title:
                  notification.title ||
                  'ExCloth',

                body:
                  notification.message ||
                  'You have a new notification.',
              },

              data: pushData,

              android: {
                priority: 'high',

                notification: {
                  sound: 'default',
                },
              },
            },
          }),
        },
      );

      const result =
        await response.json();

      if (response.ok) {
        sent += 1;

        continue;
      }

      failed += 1;

      console.error(
        'FCM error:',
        result,
      );

      const fcmError =
        result?.error?.details?.find(
          (
            detail: {
              errorCode?: string;
            },
          ) =>
            detail?.errorCode,
        );

      if (
        fcmError?.errorCode ===
        'UNREGISTERED'
      ) {
        await supabase
          .from(
            'user_push_tokens',
          )
          .delete()
          .eq(
            'token',
            item.token,
          );
      }
    }

    return jsonResponse({
      success: true,
      sent,
      failed,
    });
  } catch (error) {
    console.error(
      'Push function error:',
      error,
    );

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      },

      500,
    );
  }
});