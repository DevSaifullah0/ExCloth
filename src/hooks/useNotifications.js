import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const userIdRef = useRef(null);

  const channelRef = useRef(null);

  const instanceIdRef = useRef(
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`,
  );

  const sortNotifications = useCallback(
    list =>
      [...list].sort(
        (first, second) =>
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime(),
      ),
    [],
  );

  const fetchNotifications = useCallback(
    async ({
      silent = false,
      refreshing: shouldRefresh = false,
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        if (shouldRefresh) {
          setRefreshing(true);
        }

        setErrorMessage('');

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            'User session not found.',
          );
        }

        userIdRef.current =
          user.id;

        const {
          data,
          error,
        } = await supabase
          .from(
            'notifications',
          )
          .select(`
            id,
            user_id,
            type,
            title,
            message,
            order_id,
            return_request_id,
            coupon_id,
            data,
            is_read,
            created_at
          `)
          .eq(
            'user_id',
            user.id,
          )
          .order(
            'created_at',
            {
              ascending:
                false,
            },
          )
          .limit(100);

        if (error) {
          throw error;
        }

        setNotifications(
          Array.isArray(data)
            ? data
            : [],
        );

        return data || [];
      } catch (error) {
        if (__DEV__) {
          console.error(
            'Notifications Load Error:',
            error?.message ||
              error,
          );
        }

        setErrorMessage(
          'Unable to load notifications.',
        );

        return [];
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const refresh = useCallback(
    options =>
      fetchNotifications(
        options,
      ),
    [fetchNotifications],
  );

  useEffect(() => {
    let mounted = true;

    const setupRealtime =
      async () => {
        try {
          const {
            data: {
              user,
            },
            error,
          } =
            await supabase.auth
              .getUser();

          if (
            error ||
            !user ||
            !mounted
          ) {
            return;
          }

          userIdRef.current =
            user.id;

          if (
            channelRef.current
          ) {
            const previousChannel =
              channelRef.current;

            channelRef.current =
              null;

            await supabase
              .removeChannel(
                previousChannel,
              );
          }

          if (!mounted) {
            return;
          }

          const channelName =
            `notifications-${user.id}-${instanceIdRef.current}`;

          const channel =
            supabase
              .channel(
                channelName,
              )
              .on(
                'postgres_changes',
                {
                  event:
                    'INSERT',

                  schema:
                    'public',

                  table:
                    'notifications',

                  filter:
                    `user_id=eq.${user.id}`,
                },
                payload => {
                  const newItem =
                    payload?.new;

                  if (
                    !newItem
                  ) {
                    return;
                  }

                  setNotifications(
                    current => {
                      const exists =
                        current.some(
                          item =>
                            item.id ===
                            newItem.id,
                        );

                      if (
                        exists
                      ) {
                        return current;
                      }

                      return sortNotifications([
                        newItem,
                        ...current,
                      ]);
                    },
                  );
                },
              )
              .on(
                'postgres_changes',
                {
                  event:
                    'UPDATE',

                  schema:
                    'public',

                  table:
                    'notifications',

                  filter:
                    `user_id=eq.${user.id}`,
                },
                payload => {
                  const updated =
                    payload?.new;

                  if (
                    !updated
                  ) {
                    return;
                  }

                  setNotifications(
                    current =>
                      sortNotifications(
                        current.map(
                          item =>
                            item.id ===
                            updated.id
                              ? {
                                  ...item,
                                  ...updated,
                                }
                              : item,
                        ),
                      ),
                  );
                },
              )
              .on(
                'postgres_changes',
                {
                  event:
                    'DELETE',

                  schema:
                    'public',

                  table:
                    'notifications',
                },
                payload => {
                  const deletedId =
                    payload
                      ?.old
                      ?.id;

                  if (
                    !deletedId
                  ) {
                    return;
                  }

                  setNotifications(
                    current =>
                      current.filter(
                        item =>
                          item.id !==
                          deletedId,
                      ),
                  );
                },
              );

          channelRef.current =
            channel;

          channel.subscribe(
            status => {
              if (__DEV__) {
                if (
                  status ===
                    'CHANNEL_ERROR' ||
                  status ===
                    'TIMED_OUT'
                ) {
                  console.error(
                    'Notification Realtime Status:',
                    status,
                  );
                }
              }
            },
          );

          if (!mounted) {
            if (
              channelRef.current ===
              channel
            ) {
              channelRef.current =
                null;
            }

            await supabase
              .removeChannel(
                channel,
              );
          }
        } catch (error) {
          if (__DEV__) {
            console.error(
              'Notification Realtime Error:',
              error?.message ||
                error,
            );
          }
        }
      };

    setupRealtime();

    return () => {
      mounted = false;

      const channel =
        channelRef.current;

      channelRef.current =
        null;

      if (channel) {
        supabase
          .removeChannel(
            channel,
          )
          .catch(error => {
            if (__DEV__) {
              console.error(
                'Notification Channel Cleanup Error:',
                error?.message ||
                  error,
              );
            }
          });
      }
    };
  }, [
    sortNotifications,
  ]);

  useEffect(() => {
    fetchNotifications();
  }, [
    fetchNotifications,
  ]);

  const markAsRead =
    useCallback(
      async notificationId => {
        if (
          !notificationId
        ) {
          return false;
        }

        const existing =
          notifications.find(
            item =>
              item.id ===
              notificationId,
          );

        if (
          existing?.is_read
        ) {
          return true;
        }

        setNotifications(
          current =>
            current.map(
              item =>
                item.id ===
                notificationId
                  ? {
                      ...item,
                      is_read:
                        true,
                    }
                  : item,
            ),
        );

        const {
          error,
        } =
          await supabase.rpc(
            'mark_notification_read_secure',
            {
              p_notification_id:
                notificationId,
            },
          );

        if (error) {
          if (__DEV__) {
            console.error(
              'Mark Notification Read Error:',
              error.message,
            );
          }

          setNotifications(
            current =>
              current.map(
                item =>
                  item.id ===
                  notificationId
                    ? {
                        ...item,
                        is_read:
                          false,
                      }
                    : item,
              ),
          );

          return false;
        }

        return true;
      },
      [
        notifications,
      ],
    );

  const markAllAsRead =
    useCallback(
      async () => {
        const hasUnread =
          notifications.some(
            item =>
              !item.is_read,
          );

        if (
          !hasUnread
        ) {
          return true;
        }

        const previous =
          notifications;

        setNotifications(
          current =>
            current.map(
              item => ({
                ...item,
                is_read:
                  true,
              }),
            ),
        );

        const {
          error,
        } =
          await supabase.rpc(
            'mark_all_notifications_read_secure',
          );

        if (error) {
          if (__DEV__) {
            console.error(
              'Mark All Notifications Error:',
              error.message,
            );
          }

          setNotifications(
            previous,
          );

          return false;
        }

        return true;
      },
      [
        notifications,
      ],
    );

  const unreadCount =
    useMemo(
      () =>
        notifications.reduce(
          (
            count,
            item,
          ) =>
            item.is_read
              ? count
              : count + 1,
          0,
        ),
      [
        notifications,
      ],
    );

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    errorMessage,
    refresh,
    markAsRead,
    markAllAsRead,
  };
};

export default useNotifications;