import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';


const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  const recoveryRef = useRef(false);


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


    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();


        if (error) {
          console.log(
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

        setSession(initialSession);

      } catch (error) {
        console.log(
          'Auth Error:',
          error?.message || error,
        );

        if (mounted) {
          setSession(null);
          setIsAdmin(false);
          setRoleLoading(false);
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


        setRoleLoading(
          Boolean(newSession?.user),
        );

        setSession(newSession);


        if (!newSession?.user) {
          setIsAdmin(false);
        }
      },
    );


    return () => {
      mounted = false;
      subscription.unsubscribe();
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
        console.log(
          'Admin role check error:',
          error?.message || error,
        );


        if (active) {
          setIsAdmin(false);
        }

      } finally {
        if (active) {
          setRoleLoading(false);
        }
      }
    };


    checkAdminRole();


    return () => {
      active = false;
    };
  }, [session?.user?.id]);


  const loading =
    sessionLoading ||
    roleLoading;


  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        isAdmin,
        isRecovering,
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
