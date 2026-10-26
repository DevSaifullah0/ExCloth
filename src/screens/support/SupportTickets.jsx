import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { supabase } from '../../lib/supabase';
import { getUserFriendlyError } from '../../utils/getUserFriendlyError';

const SupportTickets = ({ navigation, route }) => {
  const isAdmin = route.params?.isAdmin === true;
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, subject, status, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) {
      Alert.alert(
        'Unable to load tickets',
        getUserFriendlyError(error, 'Please check your connection and try again.'),
      );
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const channel = supabase
      .channel(`support-ticket-list-${isAdmin ? 'admin' : 'customer'}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadTickets().catch(() => {});
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isAdmin, loadTickets]);

  const createTicket = async () => {
    const cleanSubject = subject.trim();
    const cleanMessage = firstMessage.trim();
    if (cleanSubject.length < 4 || cleanMessage.length < 1) {
      Alert.alert('Add ticket details', 'Enter a subject and describe how we can help.');
      return;
    }
    setCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Please sign in to contact support.');

      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({ user_id: authData.user.id, subject: cleanSubject })
        .select('id')
        .single();
      if (ticketError) throw ticketError;

      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({ ticket_id: ticket.id, sender_id: authData.user.id, message: cleanMessage });
      if (messageError) throw messageError;

      setSubject('');
      setFirstMessage('');
      await loadTickets();
      navigation.navigate('SupportTicketDetails', { ticketId: ticket.id, isAdmin });
    } catch (error) {
      Alert.alert(
        'Ticket not created',
        getUserFriendlyError(error, 'Please check your connection and try again.'),
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1 px-5"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 32 }}
      >
        <View className="mt-4 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100" accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back-outline" size={22} color="black" />
          </TouchableOpacity>
          <View className="ml-4 flex-1">
            <Text className="text-2xl font-extrabold text-black">{isAdmin ? 'Support Inbox' : 'Support Requests'}</Text>
            <Text className="mt-1 text-sm text-gray-500">{isAdmin ? 'Review customer conversations' : 'Create a request and follow replies'}</Text>
          </View>
        </View>

        {!isAdmin ? (
          <View className="mt-6 rounded-3xl bg-gray-100 p-5">
            <Text className="text-lg font-extrabold text-black">New support request</Text>
            <TextInput value={subject} onChangeText={setSubject} maxLength={120} placeholder="e.g. Help with my order" placeholderTextColor="#9CA3AF" className="mt-4 rounded-2xl bg-white px-4 py-3 text-black" />
            <TextInput value={firstMessage} onChangeText={setFirstMessage} maxLength={4000} multiline textAlignVertical="top" placeholder="Tell us what happened and how we can help..." placeholderTextColor="#9CA3AF" className="mt-3 min-h-28 rounded-2xl bg-white px-4 py-3 text-black" />
            <TouchableOpacity disabled={creating} onPress={createTicket} className="mt-4 h-12 flex-row items-center justify-center rounded-2xl bg-black">
              {creating ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">Create request</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        <View className="mb-3 mt-8 flex-row items-center justify-between">
          <Text className="text-lg font-extrabold text-black">{isAdmin ? 'Recent tickets' : 'Your requests'}</Text>
          <TouchableOpacity onPress={loadTickets} accessibilityRole="button" accessibilityLabel="Refresh tickets">
            <Ionicons name="refresh-outline" size={21} color="black" />
          </TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator className="mt-8" color="black" /> : tickets.length === 0 ? (
          <View className="items-center rounded-3xl bg-gray-100 px-6 py-10">
            <Ionicons name="chatbubbles-outline" size={32} color="#6B7280" />
            <Text className="mt-3 font-bold text-gray-600">No support requests yet</Text>
          </View>
        ) : tickets.map(ticket => (
          <TouchableOpacity
            key={ticket.id}
            onPress={() => navigation.navigate('SupportTicketDetails', { ticketId: ticket.id, isAdmin })}
            className="mb-3 rounded-2xl border border-gray-200 bg-white p-4"
            accessibilityRole="button"
          >
            <View className="flex-row items-start">
              <View className="mr-3 mt-1 h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="black" />
              </View>
              <View className="flex-1">
                <Text className="font-extrabold text-black" numberOfLines={2}>{ticket.subject}</Text>
                <Text className="mt-2 text-xs font-semibold uppercase text-gray-500">{ticket.status.replaceAll('_', ' ')}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={19} color="#6B7280" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SupportTickets;
