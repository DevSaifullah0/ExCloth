const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const amountText = value =>
  `Rs ${Number(value || 0).toLocaleString('en-PK', {
    maximumFractionDigits: 0,
  })}`;

const getPaymentGroup = value => {
  const status = String(value || '').toLowerCase();
  if (['paid', 'success', 'successful', 'succeeded', 'completed'].includes(status)) {
    return 'Successful';
  }
  if (['failed', 'failure', 'declined', 'error'].includes(status)) {
    return 'Failed';
  }
  return 'Pending / Other';
};

const createBarChart = ({ title, data, color = '#111827', formatValue = value => value }) => {
  const maximum = Math.max(...data.map(item => Number(item.value || 0)), 1);
  const rows = data.length
    ? data
        .map(item => {
          const value = Number(item.value || 0);
          const width = value ? Math.max((value / maximum) * 100, 2) : 0;
          return `<div class="bar-row">
            <span class="bar-label">${escapeHtml(item.label)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${color}"></div></div>
            <strong class="bar-value">${escapeHtml(formatValue(value))}</strong>
          </div>`;
        })
        .join('')
    : '<p class="muted">No data available for this period.</p>';

  return `<section class="chart-card"><h2>${escapeHtml(title)}</h2>${rows}</section>`;
};

export const buildAdminReportPdfHtml = ({
  rows = [],
  periodLabel = 'All available records',
  generatedAt = new Date().toLocaleString(),
}) => {
  const orders = rows.filter(row => row.recordType === 'Order');
  const returns = rows.filter(row => row.recordType !== 'Order');
  const sales = orders.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const paidOrders = orders.filter(row => getPaymentGroup(row.paymentStatus) === 'Successful');
  const failedOrders = orders.filter(row => getPaymentGroup(row.paymentStatus) === 'Failed');
  const refundedRows = returns.filter(row =>
    [row.status, row.paymentStatus].some(status => String(status || '').toLowerCase() === 'refunded'),
  );
  const refundedAmount = refundedRows.reduce((sum, row) => sum + Number(row.refund || 0), 0);

  const orderStatuses = new Map();
  orders.forEach(row => {
    const label = String(row.status || 'Unknown').replace(/_/g, ' ');
    orderStatuses.set(label, (orderStatuses.get(label) || 0) + 1);
  });

  const paymentStatuses = ['Successful', 'Failed', 'Pending / Other'].map(label => ({
    label,
    value: orders.filter(row => getPaymentGroup(row.paymentStatus) === label).length,
  }));

  const dailySales = new Map();
  orders.forEach(row => {
    const date = row.date ? new Date(row.date) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    dailySales.set(key, (dailySales.get(key) || 0) + Number(row.amount || 0));
  });

  const statusChart = createBarChart({
    title: 'Order status',
    data: [...orderStatuses.entries()].map(([label, value]) => ({ label, value })),
  });
  const paymentChart = createBarChart({
    title: 'Payment outcome',
    data: paymentStatuses,
    color: '#2563EB',
  });
  const salesChart = createBarChart({
    title: 'Sales by order date',
    data: [...dailySales.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-7)
      .map(([day, value]) => ({
        label: new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        }),
        value,
      })),
    color: '#059669',
    formatValue: amountText,
  });

  const reportRows = [...rows]
    .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
    .slice(0, 40)
    .map(row => {
      const isOrder = row.recordType === 'Order';
      const date = row.date ? new Date(row.date) : null;
      const dateLabel = date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
      return `<tr>
        <td>${escapeHtml(isOrder ? 'Order' : 'Return')}</td>
        <td>${escapeHtml(row.reference || '—')}</td>
        <td>${escapeHtml(dateLabel)}</td>
        <td>${escapeHtml(String(row.status || '—').replace(/_/g, ' '))}</td>
        <td>${escapeHtml(row.paymentStatus || '—')}</td>
        <td class="numeric">${escapeHtml(amountText(isOrder ? row.amount : 0))}</td>
        <td class="numeric">${escapeHtml(amountText(isOrder ? 0 : row.refund))}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @page { size: A4; margin: 16mm 13mm 17mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; font-size: 10px; }
  .top { padding: 24px 26px; background: #111827; color: #fff; border-radius: 14px; }
  .brand { font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #d1d5db; }
  h1 { margin: 12px 0 5px; font-size: 25px; line-height: 1.15; }
  .period { color: #e5e7eb; font-size: 11px; }
  .generated { margin-top: 8px; color: #9ca3af; font-size: 9px; }
  .kpis { display: flex; flex-wrap: wrap; gap: 9px; margin: 15px 0; }
  .kpi { width: 31.5%; min-height: 68px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 11px; background: #f9fafb; }
  .kpi-label { color: #6b7280; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
  .kpi-value { display: block; margin-top: 8px; font-size: 17px; font-weight: 800; color: #111827; }
  .section-title { margin: 19px 0 9px; font-size: 15px; }
  .charts { display: flex; gap: 10px; align-items: stretch; }
  .chart-card { flex: 1; min-width: 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 11px; page-break-inside: avoid; }
  .chart-card h2 { margin: 0 0 12px; font-size: 11px; }
  .bar-row { display: flex; align-items: center; gap: 6px; margin: 8px 0; }
  .bar-label { width: 65px; color: #4b5563; font-size: 8px; text-transform: capitalize; }
  .bar-track { flex: 1; height: 7px; overflow: hidden; border-radius: 8px; background: #f3f4f6; }
  .bar-fill { height: 100%; border-radius: 8px; }
  .bar-value { min-width: 36px; color: #111827; text-align: right; font-size: 8px; }
  .muted { color: #9ca3af; }
  .table-wrap { width: 100%; overflow: hidden; border: 1px solid #e5e7eb; border-radius: 9px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  th { padding: 8px 6px; background: #f3f4f6; color: #4b5563; text-align: left; font-size: 7px; text-transform: uppercase; }
  td { padding: 7px 6px; border-top: 1px solid #f3f4f6; color: #374151; font-size: 7px; overflow-wrap: anywhere; }
  tr { page-break-inside: avoid; }
  .numeric { text-align: right; white-space: nowrap; }
  .note { margin-top: 12px; color: #6b7280; font-size: 8px; line-height: 1.5; }
  .footer { margin-top: 15px; padding-top: 8px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 8px; }
  .empty { padding: 16px; color: #6b7280; text-align: center; }
  @media print { .chart-card, .kpi { break-inside: avoid; } }
</style></head>
<body>
  <header class="top">
    <div class="brand">ExCloth · Business Intelligence</div>
    <h1>Business Performance Report</h1>
    <div class="period">Reporting period: ${escapeHtml(periodLabel)}</div>
    <div class="generated">Generated ${escapeHtml(generatedAt)}</div>
  </header>

  <section class="kpis">
    <div class="kpi"><span class="kpi-label">Orders</span><strong class="kpi-value">${orders.length.toLocaleString()}</strong></div>
    <div class="kpi"><span class="kpi-label">Gross order value</span><strong class="kpi-value">${escapeHtml(amountText(sales))}</strong></div>
    <div class="kpi"><span class="kpi-label">Successful payments</span><strong class="kpi-value">${paidOrders.length.toLocaleString()}</strong></div>
    <div class="kpi"><span class="kpi-label">Failed payments</span><strong class="kpi-value">${failedOrders.length.toLocaleString()}</strong></div>
    <div class="kpi"><span class="kpi-label">Returns</span><strong class="kpi-value">${returns.length.toLocaleString()}</strong></div>
    <div class="kpi"><span class="kpi-label">Completed refunds</span><strong class="kpi-value">${escapeHtml(amountText(refundedAmount))}</strong></div>
  </section>

  <h2 class="section-title">At a glance</h2>
  <div class="charts">${statusChart}${paymentChart}</div>
  <div style="margin-top:10px">${salesChart}</div>

  <h2 class="section-title">Recent activity</h2>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Type</th><th>Reference</th><th>Date</th><th>Status</th><th>Payment</th><th class="numeric">Order value</th><th class="numeric">Refund</th></tr></thead>
      <tbody>${reportRows || '<tr><td colspan="7" class="empty">No transactions in the selected period.</td></tr>'}</tbody>
    </table>
  </div>
  ${rows.length > 40 ? `<p class="note">Showing the latest 40 of ${rows.length.toLocaleString()} matching records in the activity table. Summary graphs include all records loaded for this report.</p>` : ''}
  <p class="note">Gross order value is the sum of order totals in the selected period and is not net revenue. Refund totals include records marked refunded; verify actual gateway settlement separately.</p>
  <footer class="footer">ExCloth Admin · Confidential business report</footer>
</body></html>`;
};

export default buildAdminReportPdfHtml;
