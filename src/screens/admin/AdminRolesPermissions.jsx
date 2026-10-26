import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import AdminScreenHeader from '../../components/admin/AdminScreenHeader';

const ACCESS_GROUPS = [
  {
    title: 'Store operations',
    subtitle: 'Day-to-day customer and fulfilment work',
    icon: 'cube-outline',
    permissions: [
      { key: 'orders.read', label: 'View orders', detail: 'Access order records and payment details' },
      { key: 'orders.manage', label: 'Manage orders', detail: 'Change order fulfilment status' },
      { key: 'returns.manage', label: 'Returns & refunds', detail: 'Review return requests and refunds' },
      { key: 'customers.manage', label: 'Customers', detail: 'View, verify and manage accounts' },
    ],
  },
  {
    title: 'Catalog & marketing',
    subtitle: 'Manage what customers see in the app',
    icon: 'storefront-outline',
    permissions: [
      { key: 'catalog.manage', label: 'Products & categories', detail: 'Edit listings, stock and collections' },
      { key: 'promotions.manage', label: 'Promotions & coupons', detail: 'Create and manage discount offers' },
      { key: 'content.manage', label: 'Banners & announcements', detail: 'Publish app content and broadcasts' },
      { key: 'reviews.manage', label: 'Reviews', detail: 'Read and moderate product reviews' },
    ],
  },
  {
    title: 'Business & administration',
    subtitle: 'Sensitive reporting and team controls',
    icon: 'shield-checkmark-outline',
    permissions: [
      { key: 'reports.read', label: 'Business reports', detail: 'View and export sales performance' },
      { key: 'staff.manage', label: 'Roles & permissions', detail: 'Change access for other team members' },
    ],
  },
];

const ALL_PERMISSIONS = ACCESS_GROUPS.flatMap(group => group.permissions.map(item => item.key));
const EMPTY_ACCESS = { role: 'custom', permissions: [] };

const displayName = user => {
  const metadata = user.user_metadata || user.raw_user_meta_data || {};
  return (
    user.full_name ||
    user.name ||
    metadata.full_name ||
    metadata.name ||
    user.email ||
    'Unnamed user'
  );
};

const AdminRolesPermissions = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [accessByUser, setAccessByUser] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const selectedUserIdRef = useRef(null);
  const [draft, setDraft] = useState(EMPTY_ACCESS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const loadAccess = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErrorMessage('');
    setNotice('');
    setSaveErrorMessage('');

    try {
      const [usersResult, accessResult, sessionResult] = await Promise.all([
        supabase.rpc('get_admin_staff_secure'),
        supabase.rpc('get_admin_user_access_secure'),
        supabase.auth.getUser(),
      ]);

      if (usersResult.error || accessResult.error || sessionResult.error) {
        throw usersResult.error || accessResult.error || sessionResult.error;
      }

      const allUsers = Array.isArray(usersResult.data)
        ? usersResult.data
        : usersResult.data?.users || [];
      const staffRows = allUsers;
      const accessRows = Array.isArray(accessResult.data) ? accessResult.data : [];
      const nextAccess = {};

      accessRows.forEach(row => {
        nextAccess[row.user_id] = {
          role: row.role || 'custom',
          permissions: Array.isArray(row.permissions) ? row.permissions : [],
        };
      });

      const sessionUserId = sessionResult.data.user?.id || null;
      const currentSelection = selectedUserIdRef.current;
      const nextId = currentSelection && currentSelection !== sessionUserId && staffRows.some(user => user.id === currentSelection)
        ? currentSelection
        : staffRows.find(user => user.id !== sessionUserId)?.id || null;

      setCurrentUserId(sessionUserId);
      setUsers(staffRows);
      setAccessByUser(nextAccess);
      selectedUserIdRef.current = nextId;
      setSelectedUserId(nextId);
      setDraft(nextAccess[nextId] || EMPTY_ACCESS);
    } catch (error) {
      if (__DEV__) console.error('Admin access load error:', error?.message || error);
      setErrorMessage('Team access load nahi hua. Connection aur admin permissions check karein.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccess();
    }, [loadAccess]),
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(user => {
      const searchable = `${displayName(user)} ${user.email || ''}`.toLowerCase();
      return !query || searchable.includes(query);
    });
  }, [search, users]);

  const selectUser = userId => {
    if (userId === currentUserId) return;

    const confirmSelection = () => {
      selectedUserIdRef.current = userId;
      setSelectedUserId(userId);
      setDraft(accessByUser[userId] || EMPTY_ACCESS);
      setNotice('');
      setSaveErrorMessage('');
    };

    if (!hasChanges) {
      confirmSelection();
      return;
    }

    Alert.alert(
      'Discard unsaved changes?',
      'Aapki current permission changes save nahi hui hain.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: confirmSelection },
      ],
    );
  };

  const togglePermission = key => {
    setSaveErrorMessage('');
    setDraft(current => {
      const permissions = current.permissions.includes(key)
        ? current.permissions.filter(item => item !== key)
        : [...current.permissions, key];
      return { role: permissions.length === ALL_PERMISSIONS.length ? 'admin' : 'custom', permissions };
    });
  };

  const saveAccess = async () => {
    if (!selectedUserId || selectedUserId === currentUserId || saving) return;
    setSaving(true);
    setNotice('');
    setSaveErrorMessage('');

    const role = draft.permissions.length === ALL_PERMISSIONS.length ? 'admin' : 'custom';
    try {
      const { error } = await supabase.rpc('set_admin_user_access_secure', {
        p_user_id: selectedUserId,
        p_role: role,
        p_permissions: draft.permissions,
      });
      if (error) throw error;
      const nextAccess = { role, permissions: draft.permissions };
      setAccessByUser(current => ({ ...current, [selectedUserId]: nextAccess }));
      setDraft(nextAccess);
      setNotice('Team member access saved.');
    } catch (error) {
      if (__DEV__) console.error('Admin access save error:', error?.message || error);
      setSaveErrorMessage('Access save nahi hua. Connection aur admin permissions check karein.');
    } finally {
      setSaving(false);
    }
  };

  const renderUser = ({ item }) => {
    const selected = item.id === selectedUserId;
    const isCurrentUser = item.id === currentUserId;
    const access = accessByUser[item.id];
    return (
      <TouchableOpacity
        onPress={() => selectUser(item.id)}
        disabled={isCurrentUser}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        className={`mb-2 flex-row items-center rounded-2xl border p-3 ${selected ? 'border-black bg-gray-100' : 'border-gray-200 bg-white'} ${isCurrentUser ? 'opacity-60' : ''}`}
      >
        <View className={`h-10 w-10 items-center justify-center rounded-full ${selected ? 'bg-black' : 'bg-gray-100'}`}>
          <Ionicons name="person-outline" size={19} color={selected ? 'white' : '#555555'} />
        </View>
        <View className="ml-3 flex-1">
          <Text numberOfLines={1} className="font-bold text-black">{displayName(item)}</Text>
          <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500">{item.email || 'No email'}</Text>
        </View>
        <View className="rounded-full bg-white px-2.5 py-1">
          <Text className="text-[10px] font-extrabold uppercase text-gray-600">
            {isCurrentUser ? 'You' : access ? 'Rules saved' : 'Legacy admin'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const hasChanges = selectedUserId && (
    draft.role !== (accessByUser[selectedUserId]?.role || 'custom') ||
    draft.permissions.length !== (accessByUser[selectedUserId]?.permissions || []).length ||
    draft.permissions.some(key => !(accessByUser[selectedUserId]?.permissions || []).includes(key))
  );

  const selectedUser = users.find(user => user.id === selectedUserId);
  const configuredUsers = users.filter(user => (accessByUser[user.id]?.permissions || []).length > 0).length;
  const selectedAccessLabel = accessByUser[selectedUserId] ? 'Rules saved' : 'Legacy admin';

  const toggleAllPermissions = () => {
    setSaveErrorMessage('');
    const permissions = draft.permissions.length === ALL_PERMISSIONS.length ? [] : ALL_PERMISSIONS;
    setDraft({
      role: permissions.length === ALL_PERMISSIONS.length ? 'admin' : 'custom',
      permissions,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F6F6F6]" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-5">
        <AdminScreenHeader
          navigation={navigation}
          title="Roles & permissions"
          subtitle="Manage your team's access"
          icon="key-outline"
        />

        <FlatList
          className="flex-1"
          data={filteredUsers}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadAccess({ silent: true }); }}
            />
          )}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 16 }}
          ListHeaderComponent={(
            <View>
              <View className="mb-4 overflow-hidden rounded-[28px] bg-[#111111] p-5">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <View className="self-start flex-row items-center rounded-full bg-white/10 px-3 py-1.5">
                      <View className="mr-2 h-1.5 w-1.5 rounded-full bg-white" />
                      <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white">Team security</Text>
                    </View>
                    <Text className="mt-4 text-2xl font-extrabold leading-8 text-white">The right access,</Text>
                    <Text className="text-2xl font-extrabold leading-8 text-gray-400">for the right people.</Text>
                    <Text className="mt-2 text-xs leading-5 text-gray-300">Choose which parts of ExCloth each team member can manage.</Text>
                  </View>
                  <View className="h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                    <Ionicons name="key-outline" size={25} color="white" />
                  </View>
                </View>
                <View className="mt-5 flex-row items-center border-t border-white/15 pt-4">
                  <Ionicons name="lock-closed-outline" size={15} color="#D1D5DB" />
                  <Text className="ml-2 flex-1 text-[11px] leading-4 text-gray-300">Access changes are recorded securely for each account.</Text>
                </View>
              </View>

              <View className="mb-4 flex-row">
                <View className="mr-3 flex-1 rounded-2xl border border-gray-100 bg-white p-4">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Admin accounts</Text>
                  <Text className="mt-1 text-2xl font-extrabold text-black">{users.length}</Text>
                </View>
                <View className="flex-1 rounded-2xl border border-gray-100 bg-white p-4">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Access configured</Text>
                  <Text className="mt-1 text-2xl font-extrabold text-black">{configuredUsers}</Text>
                </View>
              </View>

              <View className="mb-4 h-12 flex-row items-center rounded-2xl border border-gray-100 bg-white px-4">
                <Ionicons name="search-outline" size={19} color="#6B7280" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search team members"
                  placeholderTextColor="#9CA3AF"
                  className="ml-3 flex-1 py-0 text-sm text-black"
                  accessibilityLabel="Search team members"
                />
              </View>

              <View className="mb-3 flex-row items-end justify-between">
                <View>
                  <Text className="text-lg font-extrabold text-black">Choose an admin</Text>
                  <Text className="mt-0.5 text-xs text-gray-500">Select an admin account to edit its saved access rules</Text>
                </View>
                <View className="rounded-full bg-white px-3 py-1.5">
                  <Text className="text-[11px] font-bold text-gray-600">{filteredUsers.length} users</Text>
                </View>
              </View>
              {loading ? (
                <View className="items-center rounded-2xl bg-white py-8"><ActivityIndicator color="black" /></View>
              ) : null}
              {!loading && errorMessage ? (
                <View className="mb-4 rounded-2xl bg-red-50 p-4">
                  <Text className="text-sm font-semibold leading-5 text-red-700">{errorMessage}</Text>
                  <TouchableOpacity onPress={() => loadAccess()} className="mt-3 self-start rounded-xl bg-black px-4 py-2.5">
                    <Text className="text-xs font-bold text-white">Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {!loading && !errorMessage && !filteredUsers.length ? (
                <View className="mb-4 items-center rounded-2xl bg-white px-5 py-7">
                  <Ionicons name="people-outline" size={26} color="#9CA3AF" />
                  <Text className="mt-2 text-sm font-semibold text-gray-600">No admin team members found</Text>
                  <Text className="mt-1 text-center text-xs leading-4 text-gray-400">Only accounts already marked as admin can be managed here. Try another search.</Text>
                </View>
              ) : null}
            </View>
          )}
          ListFooterComponent={(
            !loading && !errorMessage && selectedUser ? (
              <View className="mt-5">
                <View className="mb-4 rounded-3xl border border-gray-100 bg-white p-4">
                  <View className="flex-row items-center">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <Ionicons name="person-outline" size={23} color="#111111" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text numberOfLines={1} className="text-base font-extrabold text-black">{displayName(selectedUser)}</Text>
                      <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500">{selectedUser.email || 'No email available'}</Text>
                    </View>
                    <View className="rounded-full bg-gray-100 px-3 py-1.5">
                      <Text className="text-[10px] font-extrabold uppercase tracking-wide text-gray-700">{selectedAccessLabel}</Text>
                    </View>
                  </View>
                  <View className="mt-4 flex-row items-center border-t border-gray-100 pt-3">
                    <Ionicons name="checkmark-circle-outline" size={17} color="#555555" />
                    <Text className="ml-2 flex-1 text-xs text-gray-600">{draft.permissions.length} of {ALL_PERMISSIONS.length} permissions enabled</Text>
                    <TouchableOpacity onPress={toggleAllPermissions} activeOpacity={0.8}>
                      <Text className="text-xs font-extrabold text-black">{draft.permissions.length === ALL_PERMISSIONS.length ? 'Clear all' : 'Select all'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-3 flex-row items-end justify-between">
                  <View>
                    <Text className="text-xl font-extrabold text-black">Access controls</Text>
                    <Text className="mt-1 text-xs text-gray-500">Turn on only what this person needs</Text>
                  </View>
                  <View className="rounded-full bg-black px-3 py-1.5">
                    <Text className="text-[10px] font-extrabold text-white">{draft.permissions.length} ACTIVE</Text>
                  </View>
                </View>

                {ACCESS_GROUPS.map(group => {
                  const activeCount = group.permissions.filter(item => draft.permissions.includes(item.key)).length;
                  return (
                    <View key={group.title} className="mb-3 overflow-hidden rounded-3xl border border-gray-100 bg-white">
                      <View className="flex-row items-center px-4 pb-3 pt-4">
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                          <Ionicons name={group.icon} size={20} color="#111111" />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-sm font-extrabold text-black">{group.title}</Text>
                          <Text className="mt-0.5 text-[10px] text-gray-500">{group.subtitle}</Text>
                        </View>
                        <Text className="text-[10px] font-bold text-gray-500">{activeCount}/{group.permissions.length}</Text>
                      </View>
                      {group.permissions.map(permission => {
                        const enabled = draft.permissions.includes(permission.key);
                        return (
                          <View
                            key={permission.key}
                            className="ml-4 min-h-[68px] flex-row items-center justify-between border-t border-gray-100 py-3 pr-4"
                          >
                            <View className="mr-3 flex-1">
                              <Text className="text-sm font-bold text-gray-900">{permission.label}</Text>
                              <Text className="mt-1 text-[10px] leading-4 text-gray-500">{permission.detail}</Text>
                            </View>
                            <Switch
                              value={enabled}
                              onValueChange={() => togglePermission(permission.key)}
                              trackColor={{ false: '#E5E7EB', true: '#111111' }}
                              thumbColor="#FFFFFF"
                              accessibilityLabel={`${permission.label} permission`}
                            />
                          </View>
                        );
                      })}
                    </View>
                  );
                })}

                <View className="mb-4 flex-row rounded-2xl border border-amber-100 bg-amber-50 p-3">
                  <Ionicons name="information-circle-outline" size={19} color="#92400E" />
                  <Text className="ml-2 flex-1 text-[10px] leading-4 text-amber-900">
                    These permissions are enforced by the database for every protected admin action.
                  </Text>
                </View>

                {notice ? (
                  <View className="mb-3 flex-row items-center rounded-2xl bg-green-50 p-3">
                    <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                    <Text className="ml-2 text-xs font-bold text-green-800">{notice}</Text>
                  </View>
                ) : null}
              </View>
            ) : null
          )}
        />
        {!loading && !errorMessage && selectedUser ? (
          <View className="border-t border-gray-200 bg-[#F6F6F6] px-1 pb-3 pt-3">
            {saveErrorMessage ? (
              <Text className="mb-2 text-center text-xs font-semibold text-red-700">{saveErrorMessage}</Text>
            ) : null}
            <TouchableOpacity
              onPress={saveAccess}
              disabled={saving || !hasChanges}
              accessibilityRole="button"
              className={`h-14 flex-row items-center justify-center rounded-2xl ${saving || !hasChanges ? 'bg-gray-300' : 'bg-black'}`}
            >
              {saving ? <ActivityIndicator color="white" /> : (
                <>
                  <Ionicons name="save-outline" size={18} color="white" />
                  <Text className="ml-2 text-sm font-extrabold text-white">
                    {hasChanges ? 'Save access changes' : 'Access is up to date'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default AdminRolesPermissions;
