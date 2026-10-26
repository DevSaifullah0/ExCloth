import { buildAdminReportPdfHtml } from '../src/utils/adminReportPdf';

describe('buildAdminReportPdfHtml', () => {
  test('builds a dashboard-style report with KPIs and graphs', () => {
    const html = buildAdminReportPdfHtml({
      periodLabel: '2026-10-01 to 2026-10-08',
      rows: [
        {
          recordType: 'Order',
          reference: 'EC-101',
          date: '2026-10-07T10:00:00.000Z',
          status: 'delivered',
          paymentStatus: 'paid',
          amount: 5000,
          refund: 0,
        },
      ],
    });

    expect(html).toContain('Business Performance Report');
    expect(html).toContain('Order status');
    expect(html).toContain('Payment outcome');
    expect(html).toContain('Sales by order date');
    expect(html).toContain('Rs 5,000');
    expect(html).toContain('EC-101');
  });

  test('escapes report values before embedding them in HTML', () => {
    const html = buildAdminReportPdfHtml({
      rows: [{ recordType: 'Order', reference: '<script>alert(1)</script>' }],
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
