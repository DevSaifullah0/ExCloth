import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

const SupportTicketDetails = ({ navigation, route }) => {
  const ticketId = route.params?.ticketId;
  const isAdmin = route.params?.isAdmin === true;
  const insets = useSafeAreaInsets();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversation = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    setCurrentUserId(authData.user?.id || null);
    const [ticketResult, messagesResult] = await Promise.all([
      supabase.from('support_tickets').select('id, subject, status, updated_at').eq('id', ticketId).single(),
      supabase.from('support_messages').select('id, sender_id, message, created_at').eq('ticket_id', ticketId).order('created_at', { ascending: true }).limit(200),
    ]);
    if (ticketResult.error) throw ticketResult.error;
    if (messagesResult.error) throw messagesResult.error;
    setTicket(ticketResult.data);
    setMessages(messagesResult.data || []);
  }, [ticketId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadConversation()
      .catch(error =>
        Alert.alert(
          'Unable to load conversation',
          getUserFriendlyError(error, 'Please check your connection and try again.'),
        ),
      )
      .finally(() => active && setLoading(false));
    const channel = supabase
      .channel(`support-ticket-${ticketId}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` }, () => {
        loadConversation().catch(() => {});
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [loadConversation, ticketId]);

  const sendMessage = async () => {
    const cleanMessage = message.trim();
    if (!cleanMessage || sending) return;
    setSending(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Please sign in again.');
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: authData.user.id,
        message: cleanMessage,
      });
      if (error) throw error;
      setMessage('');
      await loadConversation();
    } catch (error) {
      Alert.alert(
        'Message not sent',
        getUserFriendlyError(error, 'Please check your connection and try again.'),
      );
    } finally {
      setSending(false);
    }
  };

  const resolveTicket = async () => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
      await loadConversation();
    } catch (error) {
      Alert.alert(
        'Unable to resolve ticket',
        getUserFriendlyError(error, 'Please check your connection and try again.'),
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="px-5 pt-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100" accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="arrow-back-outline" size={22} color="black" />
            </TouchableOpacity>
            <View className="ml-4 flex-1">
              <Text className="text-xl font-extrabold text-black" numberOfLines={1}>{ticket?.subject || 'Support conversation'}</Text>
              {ticket ? <Text className="mt-1 text-xs font-semibold uppercase text-gray-500">{ticket.status.replaceAll('_', ' ')}</Text> : null}
            </View>
            {isAdmin && ticket && !['resolved', 'closed'].includes(ticket.status) ? (
              <TouchableOpacity onPress={resolveTicket} className="rounded-xl bg-gray-100 px-3 py-2">
                <Text className="text-xs font-bold text-black">Resolve</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        {loading ? <ActivityIndicator className="flex-1" color="black" /> : (
          <ScrollView className="mt-4 flex-1 px-5" contentContainerStyle={{ paddingBottom: 18 }}>
            {messages.map(item => {
              const mine = item.sender_id === currentUserId;
              return (
                <View key={item.id} className={`mb-3 max-w-[88%] rounded-2xl px-4 py-3 ${mine ? 'self-end bg-black' : 'self-start bg-gray-100'}`}>
                  <Text className={`leading-6 ${mine ? 'text-white' : 'text-black'}`}>{item.message}</Text>
                  <Text className={`mt-2 text-[10px] ${mine ? 'text-gray-300' : 'text-gray-500'}`}>{mine ? 'You' : isAdmin ? 'Customer' : 'ExCloth Support'} · {new Date(item.created_at).toLocaleString()}</Text>
                </View>
              );
            })}
            {messages.length === 0 ? <Text className="mt-8 text-center text-gray-500">No messages yet.</Text> : null}
          </ScrollView>
        )}
        {ticket?.status === 'closed' || ticket?.status === 'resolved' ? (
          <Text className="px-5 py-4 text-center text-sm text-gray-500">This conversation is closed.</Text>
        ) : (
          <View className="flex-row items-end border-t border-gray-100 px-4 py-3" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
            <TextInput value={message} onChangeText={setMessage} maxLength={4000} multiline placeholder="Write a message..." className="max-h-28 min-h-12 flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-black" />
            <TouchableOpacity disabled={!message.trim() || sending} onPress={sendMessage} className="ml-3 h-12 w-12 items-center justify-center rounded-2xl bg-black">
              {sending ? <ActivityIndicator color="white" /> : <Ionicons name="send" size={19} color="white" />}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SupportTicketDetails;
