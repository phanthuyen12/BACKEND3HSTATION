const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mergeRequiredHeaders,
  rowForHeaders
} = require('../src/services/googleSheetsLandingService');

test('adds missing standard columns to an existing landing sheet header', () => {
  const headers = mergeRequiredHeaders(['Họ tên', 'Ca tham gia']);

  assert.deepEqual(headers.slice(0, 2), ['Họ tên', 'Ca tham gia']);
  assert.equal(headers.filter(header => header === 'Họ tên').length, 1);
  assert.ok(headers.includes('Dữ liệu đầy đủ'));
  assert.ok(headers.includes('Số điện thoại'));
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
