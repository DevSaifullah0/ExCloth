import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { buildAdminReportPdfHtml } from '../../utils/adminReportPdf';
import AdminScreenHeader from '../../components/admin/AdminScreenHeader';

const dateValue = value => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatAmount = value =>
  `Rs ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

const AdminReports = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recordFilter, setRecordFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadReport = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase.rpc('get_admin_business_report_secure');

    if (error) {
      setErrorMessage('Reports load nahi huay. Admin permissions aur backend RPCs verify karein.');
    } else {
      const orderRows = Array.isArray(data?.orders) ? data.orders : [];
      const returnRows = Array.isArray(data?.returns) ? data.returns : [];
      setOrders(orderRows);
      setReturns(returnRows);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport]),
  );

  const dateRange = useMemo(() => {
    const start = startDate ? dateValue(`${startDate}T00:00:00`) : null;
    const end = endDate ? dateValue(`${endDate}T23:59:59.999`) : null;
    if ((startDate && !start) || (endDate && !end)) {
      return { valid: false, includes: () => false };
    }
    if (start && end && start > end) {
      return { valid: false, includes: () => false };
    }

    return {
      valid: true,
      includes: value => {
        const date = dateValue(value);
        return Boolean(date && (!start || date >= start) && (!end || date <= end));
      },
    };
  }, [startDate, endDate]);

  const reportRows = useMemo(() => {
    if (!dateRange.valid) return [];

    const orderRecords = orders
      .filter(order => dateRange.includes(order.created_at))
      .map(order => ({
        recordType: 'Order',
        recordId: order.id,
        reference: order.order_number || order.id,
        date: order.created_at,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        amount: Number(order.total_amount || 0),
        refund: 0,
      }));

    const refundRecords = returns
      .filter(item => dateRange.includes(item.created_at || item.updated_at))
      .map(item => ({
        recordType: 'Return / refund',
        recordId: item.id,
        reference: item.return_number || item.order_number || item.order_id || item.id,
        date: item.created_at || item.updated_at,
        status: item.status,
        paymentStatus: item.refund_status,
        paymentMethod: item.refund_method || item.payment_method,
        amount: 0,
        refund: Number(item.refund_amount ?? item.estimated_refund_amount ?? 0),
      }));

    return [
      ...(recordFilter === 'refunds' ? [] : orderRecords),
      ...(recordFilter === 'orders' ? [] : refundRecords),
    ].sort((left, right) => (dateValue(right.date)?.getTime() || 0) - (dateValue(left.date)?.getTime() || 0));
  }, [dateRange, orders, returns, recordFilter]);

  const stats = useMemo(() => {
    const orderRecords = reportRows.filter(row => row.recordType === 'Order');
    const refundRecords = reportRows.filter(row => row.recordType !== 'Order');
    return {
      orderCount: orderRecords.length,
      grossSales: orderRecords.reduce((sum, row) => sum + row.amount, 0),
      successfulPayments: orderRecords.filter(row =>
        ['paid', 'success', 'successful', 'succeeded', 'completed'].includes(
          String(row.paymentStatus || '').toLowerCase(),
        ),
      ).length,
      failedPayments: orderRecords.filter(row => String(row.paymentStatus || '').toLowerCase() === 'failed').length,
      refundCount: refundRecords.length,
      refundedTotal: refundRecords
        .filter(row => [row.status, row.paymentStatus].some(value => String(value || '').toLowerCase() === 'refunded'))
        .reduce((sum, row) => sum + row.refund, 0),
    };
  }, [reportRows]);

  const exportPdf = async () => {
    if (!dateRange.valid) {
      Alert.alert('Date range check karein', 'Dates YYYY-MM-DD format mein hon aur start date end date se pehle ho.');
      return;
    }
    if (!reportRows.length) {
      Alert.alert('No report data', 'Selected date range mein export karne ke liye records nahi hain.');
      return;
    }

    setExporting(true);
    try {
      const html = buildAdminReportPdfHtml({
        rows: reportRows,
        periodLabel: startDate || endDate
          ? `${startDate || 'Beginning'} to ${endDate || 'Today'}`
          : 'All available records',
        generatedAt: new Date().toLocaleString(),
      });
      const fileName = `excloth-business-report-${new Date()
        .toISOString()
        .slice(0, 10)}`;
      const pdf = await generatePDF({
        html,
        fileName,
        directory: 'Documents',
        width: 595,
        height: 842,
        padding: 24,
      });

      if (!pdf?.filePath) {
        throw new Error('PDF file was not created.');
      }

      await Share.open({
        title: 'ExCloth Business Report',
        subject: 'ExCloth Business Performance Report',
        url: pdf.filePath.startsWith('file://')
          ? pdf.filePath
          : `file://${pdf.filePath}`,
        type: 'application/pdf',
        filename: `${fileName}.pdf`,
        failOnCancel: false,
      });
    } catch (error) {
      if (!/cancel|dismiss/i.test(String(error?.message || ''))) {
        Alert.alert('PDF export failed', 'PDF generate ya share nahi ho saki. Dobara try karein.');
      }
    } finally {
      setExporting(false);
    }
  };

  const metric = (label, value, icon) => (
    <View className="mb-3 w-[48%] rounded-2xl bg-gray-100 p-4">
      <Ionicons name={icon} size={20} color="#555555" />
      <Text className="mt-3 text-xs font-semibold text-gray-500">{label}</Text>
      <Text numberOfLines={1} className="mt-1 text-lg font-extrabold text-black">{value}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReport({ silent: true }); }} />}
      >
        <AdminScreenHeader
          navigation={navigation}
          title="Business Reports"
          subtitle="Orders, payments and refunds."
          icon="bar-chart-outline"
        />

        <View className="mt-6 flex-row flex-wrap justify-between">
          {metric('Orders', stats.orderCount, 'bag-handle-outline')}
          {metric('Gross order value', formatAmount(stats.grossSales), 'cash-outline')}
          {metric('Successful payments', stats.successfulPayments, 'checkmark-circle-outline')}
          {metric('Failed payments', stats.failedPayments, 'alert-circle-outline')}
          {metric('Completed refunds', formatAmount(stats.refundedTotal), 'return-down-back-outline')}
        </View>

        <Text className="mt-4 text-lg font-extrabold text-black">Report period</Text>
        <View className="mt-3 flex-row">
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="Start YYYY-MM-DD"
            autoCapitalize="none"
            className="mr-2 flex-1 rounded-xl bg-gray-100 px-3 py-3 text-sm text-black"
          />
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            placeholder="End YYYY-MM-DD"
            autoCapitalize="none"
            className="flex-1 rounded-xl bg-gray-100 px-3 py-3 text-sm text-black"
          />
        </View>
        {!dateRange.valid ? <Text className="mt-2 text-sm text-red-600">Date format/range check karein.</Text> : null}

        <View className="mt-5 flex-row rounded-2xl bg-gray-100 p-1">
          {[
            ['all', 'All'],
            ['orders', 'Orders'],
            ['refunds', 'Returns'],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setRecordFilter(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: recordFilter === key }}
              className={`flex-1 items-center rounded-xl py-3 ${recordFilter === key ? 'bg-white' : ''}`}
            >
              <Text className={`text-sm font-bold ${recordFilter === key ? 'text-black' : 'text-gray-500'}`}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity disabled={exporting || loading} onPress={exportPdf} className="mt-4 flex-row items-center justify-center rounded-2xl bg-black py-4">
          {exporting ? <ActivityIndicator color="white" /> : <Ionicons name="document-text-outline" size={20} color="white" />}
          <Text className="ml-2 font-extrabold text-white">{exporting ? 'Preparing PDF…' : 'Export PDF report'}</Text>
        </TouchableOpacity>
        <Text className="mt-2 text-xs leading-5 text-gray-500">
          Dashboard-style PDF native share sheet se save ya share karein. Report current admin records par based hai.
        </Text>

        <View className="mb-3 mt-7 flex-row items-center justify-between">
          <Text className="text-lg font-extrabold text-black">Transactions</Text>
          <Text className="text-xs text-gray-500">{reportRows.length} records</Text>
        </View>

        {loading ? (
          <View className="items-center py-12"><ActivityIndicator size="large" color="black" /></View>
        ) : errorMessage ? (
          <View className="rounded-2xl bg-red-50 p-4">
            <Text className="text-sm text-red-700">{errorMessage}</Text>
            <TouchableOpacity onPress={() => loadReport()} className="mt-3 self-start"><Text className="font-bold text-black">Try again</Text></TouchableOpacity>
          </View>
        ) : reportRows.length ? reportRows.slice(0, 100).map((row, index) => (
          <TouchableOpacity
            key={`${row.recordType}-${row.reference}-${index}`}
            disabled={!row.recordId}
            onPress={() => navigation.navigate(
              row.recordType === 'Order' ? 'AdminOrderDetails' : 'AdminReturnDetails',
              row.recordType === 'Order' ? { orderId: row.recordId } : { returnRequestId: row.recordId },
            )}
            activeOpacity={0.8}
            className="mb-2 rounded-2xl border border-gray-100 p-4"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="font-extrabold text-black">{row.recordType} · {String(row.reference || '—')}</Text>
                <Text className="mt-1 text-xs text-gray-500">{row.date ? new Date(row.date).toLocaleDateString() : '—'} · {String(row.status || 'unknown').replace(/_/g, ' ')}</Text>
                {row.recordType === 'Order' ? <Text className="mt-1 text-xs text-gray-500">Payment: {row.paymentStatus || 'unknown'} · {row.paymentMethod || '—'}</Text> : null}
              </View>
              <Text className="ml-3 font-extrabold text-black">{formatAmount(row.recordType === 'Order' ? row.amount : row.refund)}</Text>
            </View>
          </TouchableOpacity>
        )) : (
          <View className="items-center rounded-2xl bg-gray-50 py-10">
            <Ionicons name="document-text-outline" size={42} color="#9CA3AF" />
            <Text className="mt-3 font-semibold text-gray-600">No records in this period</Text>
          </View>
        )}
        {reportRows.length > 100 ? <Text className="mt-2 text-center text-xs text-gray-500">Showing latest 100 records. Export includes all loaded records.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminReports;
