const includesAny = (message, patterns) =>
  patterns.some(pattern =>
    message.includes(pattern),
  );

export const getUserFriendlyError = (
  error,
  fallback = 'Something went wrong. Please try again.',
) => {
  const raw =
    typeof error?.message === 'string'
      ? error.message.trim()
      : '';

  if (!raw) {
    return fallback;
  }

  const message = raw.toLowerCase();

  // -----------------------------------------
  // Network
  // -----------------------------------------

  if (
    includesAny(message, [
      'network request failed',
      'failed to fetch',
      'network error',
      'fetch failed',
      'connection refused',
      'connection timed out',
      'request timed out',
      'timeout',
    ])
  ) {
    return 'Unable to connect. Check your internet connection and try again.';
  }

  // -----------------------------------------
  // Authentication
  // -----------------------------------------

  if (
    includesAny(message, [
      'invalid login credentials',
      'invalid credentials',
    ])
  ) {
    return 'Email or password is incorrect.';
  }

  if (
    includesAny(message, [
      'email not confirmed',
      'email is not confirmed',
    ])
  ) {
    return 'Please verify your email before signing in.';
  }

  if (
    includesAny(message, [
      'user already registered',
      'already been registered',
      'already registered',
    ])
  ) {
    return 'An account with this email already exists.';
  }

  if (
    includesAny(message, [
      'password should be at least',
      'password must be at least',
      'weak password',
    ])
  ) {
    return 'Please choose a stronger password.';
  }

  if (
    includesAny(message, [
      'rate limit',
      'too many requests',
      'too many attempts',
    ])
  ) {
    return 'Too many attempts. Please try again later.';
  }

  if (
    includesAny(message, [
      'otp expired',
      'invalid otp',
      'token expired',
      'token has expired',
      'verification code expired',
      'invalid verification code',
    ])
  ) {
    return fallback;
  }

  // -----------------------------------------
  // Session
  // -----------------------------------------

  if (
    includesAny(message, [
      'jwt expired',
      'refresh token',
      'session expired',
      'session has expired',
      'session not found',
    ])
  ) {
    return 'Your session has expired. Please sign in again.';
  }

  // -----------------------------------------
  // Hide backend / database implementation
  // -----------------------------------------

  if (
    includesAny(message, [
      'supabase',
      'postgrest',
      'pgrst',
      'postgres',
      'sqlstate',
      'row-level security',
      'row level security',
      'permission denied',
      'duplicate key',
      'foreign key',
      'constraint',
      'violates',
      'null value in column',
      'relation ',
      'column ',
      'schema ',
      'rpc',
      'edge function',
      'non-2xx',
      'status code 500',
      'internal server error',
      'cannot read properties',
      'undefined is not',
      'syntax error',
      'unexpected token',
      'stack trace',
    ]) ||
    /\bpgrst\d+\b/i.test(raw) ||
    raw.length > 180 ||
    raw.includes('\n') ||
    raw.includes('{') ||
    raw.includes('}')
  ) {
    return fallback;
  }

  // Non-technical business messages are allowed through.
  return raw;
};
