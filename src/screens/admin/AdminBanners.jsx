import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
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

const EMPTY_FORM = {
  id: null,
  title: '',
  subtitle: '',
  image_url: '',
  sort_order: '0',
  is_active: false,
};

const AdminBanners = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formVisible, setFormVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadBanners = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('app_banners')
      .select('id, title, subtitle, image_url, sort_order, is_active, starts_at, ends_at, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMessage('Banners load nahi huay. Migration deploy karke dobara try karein.');
    } else {
      setBanners(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBanners();
    }, [loadBanners]),
  );

  const updateForm = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setFormVisible(true);
  };

  const startEdit = banner => {
    setForm({
      id: banner.id,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      sort_order: String(banner.sort_order ?? 0),
      is_active: Boolean(banner.is_active),
    });
    setFormVisible(true);
  };

  const saveBanner = async () => {
    const title = form.title.trim();
    const imageUrl = form.image_url.trim();
    const order = Number(form.sort_order);

    if (!title || !/^https:\/\//i.test(imageUrl) || !Number.isInteger(order)) {
      Alert.alert('Details check karein', 'Title, HTTPS image URL, aur valid whole-number order required hain.');
      return;
    }

    setSaving(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      setSaving(false);
      Alert.alert('Session expired', 'Admin session dobara sign in karein.');
      return;
    }

    const values = {
      title,
      subtitle: form.subtitle.trim(),
      image_url: imageUrl,
      sort_order: order,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
    const request = form.id
      ? supabase.from('app_banners').update(values).eq('id', form.id)
      : supabase.from('app_banners').insert({ ...values, created_by: authData.user.id });
    const { error } = await request;
    setSaving(false);

    if (error) {
      Alert.alert('Save nahi hua', 'Admin permission aur database migration verify karein.');
      return;
    }

    setFormVisible(false);
    setForm(EMPTY_FORM);
    loadBanners({ silent: true });
  };

  const toggleActive = async banner => {
    const { error } = await supabase
      .from('app_banners')
      .update({ is_active: !banner.is_active, updated_at: new Date().toISOString() })
      .eq('id', banner.id);

    if (error) {
      Alert.alert('Update nahi hua', 'Banner status change karne ki permission verify karein.');
    } else {
      loadBanners({ silent: true });
    }
  };

  const deleteBanner = banner => {
    Alert.alert('Banner delete karein?', `“${banner.title}” app se remove ho jayega.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('app_banners').delete().eq('id', banner.id);
          if (error) {
            Alert.alert('Delete nahi hua', 'Admin permission verify karein.');
          } else {
            loadBanners({ silent: true });
          }
        },
      },
    ]);
  };

  const renderBanner = ({ item }) => (
    <View className="mb-4 overflow-hidden rounded-3xl border border-gray-200 bg-white">
      <Image source={{ uri: item.image_url }} className="h-44 w-full bg-gray-100" resizeMode="cover" />
      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="text-lg font-extrabold text-black">{item.title}</Text>
            {item.subtitle ? <Text className="mt-1 text-sm text-gray-500">{item.subtitle}</Text> : null}
          </View>
          <View className={`rounded-full px-3 py-1 ${item.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Text className={`text-xs font-bold ${item.is_active ? 'text-green-800' : 'text-gray-600'}`}>
              {item.is_active ? 'Live' : 'Hidden'}
            </Text>
          </View>
        </View>
        <Text className="mt-2 text-xs text-gray-400">Position {item.sort_order}</Text>
        <View className="mt-4 flex-row">
          <TouchableOpacity onPress={() => toggleActive(item)} className="mr-2 flex-1 items-center rounded-xl bg-gray-100 py-3">
            <Text className="font-bold text-black">{item.is_active ? 'Hide' : 'Publish'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => startEdit(item)} accessibilityLabel={`Edit ${item.title}`} className="mr-2 h-11 w-12 items-center justify-center rounded-xl bg-gray-100">
            <Ionicons name="create-outline" size={20} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteBanner(item)} accessibilityLabel={`Delete ${item.title}`} className="h-11 w-12 items-center justify-center rounded-xl bg-red-50">
            <Ionicons name="trash-outline" size={20} color="#B91C1C" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-5">
        <AdminScreenHeader
          navigation={navigation}
          title="App Banners"
          subtitle="Publish Home screen content."
          icon="images-outline"
          action={{ onPress: startCreate, label: 'Create banner', icon: 'add' }}
        />

        {formVisible ? (
          <View className="my-4 rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <Text className="mb-3 text-lg font-extrabold text-black">{form.id ? 'Edit banner' : 'New banner'}</Text>
            <TextInput value={form.title} onChangeText={value => updateForm('title', value)} placeholder="Title" maxLength={120} className="mb-2 rounded-xl bg-white px-4 py-3 text-black" />
            <TextInput value={form.subtitle} onChangeText={value => updateForm('subtitle', value)} placeholder="Short subtitle (optional)" maxLength={240} className="mb-2 rounded-xl bg-white px-4 py-3 text-black" />
            <TextInput value={form.image_url} onChangeText={value => updateForm('image_url', value)} placeholder="https://... image URL" autoCapitalize="none" keyboardType="url" className="mb-2 rounded-xl bg-white px-4 py-3 text-black" />
            <TextInput value={form.sort_order} onChangeText={value => updateForm('sort_order', value)} placeholder="Display order" keyboardType="number-pad" className="mb-3 rounded-xl bg-white px-4 py-3 text-black" />
            <TouchableOpacity onPress={() => updateForm('is_active', !form.is_active)} accessibilityRole="switch" accessibilityState={{ checked: form.is_active }} className="mb-3 flex-row items-center">
              <Ionicons name={form.is_active ? 'checkbox' : 'square-outline'} size={21} color="black" />
              <Text className="ml-2 font-semibold text-black">Publish immediately</Text>
            </TouchableOpacity>
            <View className="flex-row">
              <TouchableOpacity disabled={saving} onPress={saveBanner} className="mr-2 flex-1 items-center rounded-xl bg-black py-3">
                {saving ? <ActivityIndicator color="white" /> : <Text className="font-bold text-white">Save banner</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFormVisible(false)} className="items-center rounded-xl bg-white px-5 py-3">
                <Text className="font-bold text-black">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {errorMessage ? <Text className="my-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</Text> : null}
        {loading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="black" /></View>
        ) : (
          <FlatList
            data={banners}
            keyExtractor={item => item.id}
            renderItem={renderBanner}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 18, paddingBottom: Math.max(insets.bottom, 20) + 28, flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBanners({ silent: true }); }} />}
            ListEmptyComponent={<View className="flex-1 items-center justify-center py-20"><Ionicons name="images-outline" size={54} color="#D1D5DB" /><Text className="mt-4 text-lg font-bold text-black">No banners yet</Text><Text className="mt-1 text-center text-sm text-gray-500">Create a banner to show it on the customer Home screen.</Text></View>}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default AdminBanners;
