import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';

const NETWORK_ERROR_PATTERNS = [
  'network request failed',
  'failed to fetch',
  'network error',
  'fetch failed',
  'connection refused',
  'connection timed out',
  'request timed out',
  'timeout',
  'aborted',
  'load failed',
  'offline',
  'could not connect',
];

const isNetworkFailure = error => {
  const message = String(error?.message || '').toLowerCase();
  return NETWORK_ERROR_PATTERNS.some(pattern => message.includes(pattern));
};

const useInternetConnection = () => {
  const [isConnected, setIsConnected] = useState(null);
  const [checking, setChecking] = useState(true);
  const requestInFlight = useRef(false);

  const checkConnection = useCallback(async ({ showIndicator = false } = {}) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (showIndicator) setChecking(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const { error } = await supabase
        .from('products')
        .select('id', { head: true })
        .limit(1)
        .abortSignal(controller.signal);

      setIsConnected(!isNetworkFailure(error));
    } catch (error) {
      setIsConnected(!isNetworkFailure(error) && error?.name !== 'AbortError');
    } finally {
      clearTimeout(timeout);
      requestInFlight.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnection({ showIndicator: true });

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') checkConnection();
    }, 30000);

    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') checkConnection({ showIndicator: true });
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [checkConnection]);

  return {
    isConnected,
    checking,
    retryConnection: () => checkConnection({ showIndicator: true }),
  };
};

export default useInternetConnection;
