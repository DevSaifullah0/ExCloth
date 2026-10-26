import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Linking } from 'react-native';

import { supabase } from '../lib/supabase';
import { AUTH_REDIRECT_URL } from '../lib/authRedirect';


const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [oauthError, setOAuthError] = useState(null);
  const [accountCreatedNoticeVisible, setAccountCreatedNoticeVisible] =
    useState(false);

  const recoveryRef = useRef(false);
  const activeUserIdRef = useRef(null);
  const clearOAuthError = useCallback(() => setOAuthError(null), []);


  const startRecovery = () => {
    recoveryRef.current = true;

    setIsRecovering(true);
    setIsAdmin(false);
    setRoleLoading(false);
    setSession(null);
  };


  const finishRecovery = () => {
    recoveryRef.current = false;

    setIsRecovering(false);
    setIsAdmin(false);
    setRoleLoading(false);
    setSession(null);
  };


  useEffect(() => {
    let mounted = true;
    const oauthCallbackPromises = new Map();

    const completeOAuthRedirect = url => {
      if (!url?.startsWith(AUTH_REDIRECT_URL)) {
        return Promise.resolve();
      }

      if (oauthCallbackPromises.has(url)) {
        return oauthCallbackPromises.get(url);
      }

      const callbackPromise = (async () => {
        try {
          const callbackUrl = new URL(url);
          const callbackError =
            callbackUrl.searchParams.get('error_description') ||
            callbackUrl.searchParams.get('error');

          if (callbackError) {
            setOAuthError(callbackError);
            return;
          }

          const code = callbackUrl.searchParams.get('code');
          if (!code) return;

          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } catch (error) {
          setOAuthError(error?.message || 'Google sign-in could not be completed.');
          if (__DEV__) {
            console.warn('OAuth callback failed:', error?.message || error);
          }
        }
      })();

      oauthCallbackPromises.set(url, callbackPromise);
      return callbackPromise;
    };

    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      completeOAuthRedirect(url);
    });

    const getInitialSession = async () => {
      try {
        // A cold start from Google returns the app with a PKCE code in the
        // initial URL. Exchange it before reading storage so a stale empty
        // session cannot overwrite the freshly authenticated session.
        const initialUrl = await Linking.getInitialURL();
        await completeOAuthRedirect(initialUrl);

        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();


        if (error && __DEV__) {
          console.error(
            'Session Error:',
            error.message,
          );
        }


        if (!mounted) {
          return;
        }


        setRoleLoading(
          Boolean(initialSession?.user),
        );
        activeUserIdRef.current =
          initialSession?.user?.id || null;

        setSession(initialSession);

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Auth Error:',
            error?.message || error,
          );
        }

        if (mounted) {
          setSession(null);
          setIsAdmin(false);
          setRoleLoading(false);
          setAuthInitialized(true);
        }

      } finally {
        if (mounted) {
          setSessionLoading(false);
        }
      }
    };


    getInitialSession();


    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (
          event ===
          'PASSWORD_RECOVERY'
        ) {
          recoveryRef.current = true;

          setIsRecovering(true);
          setIsAdmin(false);
          setRoleLoading(false);

          return;
        }


        if (recoveryRef.current) {
          return;
        }

        const nextUserId =
          newSession?.user?.id || null;
        const userChanged =
          activeUserIdRef.current !== nextUserId;

        activeUserIdRef.current = nextUserId;

        if (userChanged) {
          setRoleLoading(Boolean(nextUserId));
        }

        setSession(newSession);


        if (!newSession?.user) {
          setIsAdmin(false);
          setRoleLoading(false);
        }
      },
    );


    return () => {
      mounted = false;
      subscription.unsubscribe();
      urlSubscription.remove();
    };
  }, []);


  useEffect(() => {
    let active = true;


    const checkAdminRole = async () => {
      if (
        !session?.user ||
        recoveryRef.current
      ) {
        if (active) {
          setIsAdmin(false);
          setRoleLoading(false);

          if (!sessionLoading) {
            setAuthInitialized(true);
          }
        }

        return;
      }


      setRoleLoading(true);


      try {
        const {
          data,
          error,
        } = await supabase.rpc(
          'is_admin_secure',
        );


        if (error) {
          throw error;
        }


        if (!active) {
          return;
        }


        setIsAdmin(data === true);

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Admin role check error:',
            error?.message || error,
          );
        }


        if (active) {
          setIsAdmin(false);
        }

      } finally {
        if (active) {
          setRoleLoading(false);
          setAuthInitialized(true);
        }
      }
    };


    checkAdminRole();


    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, sessionLoading]);


  const loading =
    sessionLoading ||
    !authInitialized;


  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        roleLoading,
        isAdmin,
        isRecovering,
        oauthError,
        clearOAuthError,
        accountCreatedNoticeVisible,
        showAccountCreatedNotice: () =>
          setAccountCreatedNoticeVisible(true),
        dismissAccountCreatedNotice: () =>
          setAccountCreatedNoticeVisible(false),
        startRecovery,
        finishRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  return useContext(AuthContext);
};
