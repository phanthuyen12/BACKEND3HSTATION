const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mergeRequiredHeaders,
  rowForHeaders
} = require('../src/services/googleSheetsLandingService');

test('adds missing standard columns to an existing landing sheet header', () => {
  const headers = mergeRequiredHeaders(
    ['Họ tên', 'Ca tham gia'],
    ['ho_ten', 'so_dien_thoai', 'ca_tham_gia']
  );

  assert.deepEqual(headers.slice(0, 2), ['Họ tên', 'Ca tham gia']);
  assert.equal(headers.filter(header => header === 'Họ tên').length, 1);
  assert.ok(headers.includes('Dữ liệu đầy đủ'));
  assert.ok(headers.includes('Số điện thoại'));
  assert.ok(headers.includes('ho_ten'));
  assert.ok(headers.includes('so_dien_thoai'));
  assert.ok(headers.includes('ca_tham_gia'));
});

test('writes the complete flat form payload as compact JSON', () => {
  const fields = {
    ho_ten: 'thanh@gmail.com',
    so_dien_thoai: '3453453',
    ca_tham_gia: 'Ca chiều — giờ linh hoạt',
    van_de_lon_nhat: 'Không có thời gian phân tích',
    von_thuc_hanh: 'Có 299$ vốn rủi ro, cần hướng dẫn mở tài khoản',
    xac_nhan_von: 'Đã hiểu và đồng ý',
    cam_ket_tham_gia: 'Đã cam kết'
  };

  const row = rowForHeaders({
    headers: ['Dữ liệu đầy đủ'],
    landingPage: { id: 8, title: 'Landing 8' },
    submission: { id: 1 },
    fields
  });

  assert.deepEqual(row, [JSON.stringify(fields)]);
});

test('writes every submitted form field into its own matching column', () => {
  const fields = {
    ho_ten: 'thanh@gmail.com',
    so_dien_thoai: '3453453',
    ca_tham_gia: 'Chưa biết, tư vấn giúp tôi',
    van_de_lon_nhat: 'Không có thời gian phân tích',
    von_thuc_hanh: 'Có 299$ vốn rủi ro, cần hướng dẫn mở tài khoản',
    xac_nhan_von: 'Đã hiểu và đồng ý',
    cam_ket_tham_gia: 'Đã cam kết'
  };
  const headers = Object.keys(fields);

  const row = rowForHeaders({
    headers,
    landingPage: { id: 8, title: 'Landing 8' },
    submission: { id: 1 },
    fields
  });

  assert.deepEqual(row, Object.values(fields));
});
