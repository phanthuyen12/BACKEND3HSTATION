const crypto = require('crypto');
const fs = require('fs');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const HEADER = [
  'Thời gian',
  'Submission ID',
  'Landing ID',
  'Tên landing',
  'Họ tên',
  'Số điện thoại',
  'Email',
  'Admin hỗ trợ',
  'Nguồn',
  'Dữ liệu đầy đủ'
];

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function extractSpreadsheetId(value) {
  const input = String(value || '').trim();
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input;
}

function loadCredentials() {
  let raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON;

  if (!raw && process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_BASE64) {
    raw = Buffer.from(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
  }

  if (!raw && process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE) {
    raw = fs.readFileSync(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE, 'utf8');
  }

  if (!raw) return null;

  const credentials = JSON.parse(raw);
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Google service account JSON thiếu client_email hoặc private_key');
  }
  return credentials;
}

async function accessToken(credentials) {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsignedJwt = `${header}.${claim}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsignedJwt), credentials.private_key);
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error || 'Không lấy được Google access token');
  }

  cachedToken = result.access_token;
  cachedTokenExpiresAt = Date.now() + Number(result.expires_in || 3600) * 1000;
  return cachedToken;
}

async function sheetsRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || `Google Sheets API trả về HTTP ${response.status}`);
  }
  return result;
}

function quoteSheetName(sheetName) {
  return `'${String(sheetName).replace(/'/g, "''")}'`;
}

function landingSheetName(landingPage) {
  const prefix = String(process.env.GOOGLE_SHEETS_TAB_PREFIX || 'Landing').trim() || 'Landing';
  return String(landingPage.google_sheet_tab_name || `${prefix} ${landingPage.id}`)
    .trim()
    .replace(/[\[\]:*?/\\]/g, '-')
    .slice(0, 100);
}

function normalizeHeader(header) {
  return String(header || '').trim().toLocaleLowerCase('vi-VN');
}

function mergeRequiredHeaders(currentHeaders) {
  const headers = currentHeaders.map(value => String(value));
  const existing = new Set(headers.map(normalizeHeader).filter(Boolean));

  for (const header of HEADER) {
    const normalized = normalizeHeader(header);
    if (!existing.has(normalized)) {
      headers.push(header);
      existing.add(normalized);
    }
  }

  return headers;
}

async function ensureSheetAndHeader(spreadsheetId, sheetName, token) {
  const spreadsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`;
  const spreadsheet = await sheetsRequest(spreadsheetUrl, token);
  const exists = (spreadsheet.sheets || []).some(sheet => sheet.properties?.title === sheetName);

  if (!exists) {
    try {
      await sheetsRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            requests: [{ addSheet: { properties: { title: sheetName } } }]
          })
        }
      );
    } catch (error) {
      // Two simultaneous first leads may both try to create the same tab.
      // Continue if the only issue is that the tab was created by the other request.
      if (!/already exists/i.test(error.message)) throw error;
    }
  }

  const range = encodeURIComponent(`${quoteSheetName(sheetName)}!A1:ZZ1`);
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`;
  const current = await sheetsRequest(baseUrl, token);
  const currentHeaders = current.values?.[0]?.map(value => String(value)) || [];
  const hasHeader = currentHeaders.some(header => header.trim() !== '');
  const headers = hasHeader ? mergeRequiredHeaders(currentHeaders) : [...HEADER];

  // Existing landing tabs may have been created with an older/custom header.
  // Keep those columns intact and append any missing standard columns so
  // "Dữ liệu đầy đủ" is also available without recreating the tab.
  if (!hasHeader || headers.length !== currentHeaders.length) {
    await sheetsRequest(`${baseUrl}?valueInputOption=RAW`, token, {
      method: 'PUT',
      body: JSON.stringify({ values: [headers] })
    });
  }

  return headers;
}

function pick(fields, names) {
  for (const name of names) {
    if (fields[name] !== undefined && fields[name] !== null) return String(fields[name]);
  }
  return '';
}

function normalizeContactFields(fields) {
  let name = pick(fields, ['ho_ten', 'full_name', 'name', 'hoten']).trim();
  let email = pick(fields, ['email', 'email_address']).trim();

  // Some custom landing pages submit an email address using the `ho_ten`
  // field. Preserve the original name value and also populate Email.
  if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)) {
    email = name;
  }

  return {
    name,
    phone: pick(fields, ['so_dien_thoai', 'phone', 'phone_number', 'sdt']).trim(),
    email,
    adminSupport: pick(fields, [
      'admin_ho_tro',
      'admin_dang_ho_tro',
      'admin_support'
    ]).trim(),
    source: pick(fields, ['source', 'nguon', 'utm_source']).trim()
  };
}

function columnName(columnNumber) {
  let value = Number(columnNumber);
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result || 'A';
}

function rowForHeaders({ headers, landingPage, submission, fields, submittedAt = new Date().toISOString() }) {
  const contact = normalizeContactFields(fields);
  const standardValues = {
    'thời gian': submittedAt,
    'submission id': submission?.id || '',
    'landing id': landingPage.id,
    'tên landing': landingPage.title || '',
    'họ tên': contact.name,
    'số điện thoại': contact.phone,
    'email': contact.email,
    'admin hỗ trợ': contact.adminSupport,
    'nguồn': contact.source,
    'dữ liệu đầy đủ': JSON.stringify(fields)
  };

  return headers.map(header => {
    const originalHeader = String(header || '').trim();
    const normalizedHeader = normalizeHeader(originalHeader);
    if (Object.prototype.hasOwnProperty.call(standardValues, normalizedHeader)) {
      return standardValues[normalizedHeader];
    }
    if (Object.prototype.hasOwnProperty.call(fields, originalHeader)) {
      const value = fields[originalHeader];
      return value === undefined || value === null ? '' : String(value);
    }
    return '';
  });
}

async function appendLandingSubmission({ landingPage, submission, fields }) {
  const spreadsheetId = extractSpreadsheetId(
    landingPage.google_sheet_id || process.env.GOOGLE_SHEETS_SPREADSHEET
  );
  if (!spreadsheetId) return { skipped: true, reason: 'missing_spreadsheet' };

  const credentials = loadCredentials();
  if (!credentials) return { skipped: true, reason: 'missing_credentials' };

  const sheetName = landingSheetName(landingPage);
  const token = await accessToken(credentials);
  const headers = await ensureSheetAndHeader(spreadsheetId, sheetName, token);
  const row = rowForHeaders({ headers, landingPage, submission, fields });
  const lastColumn = columnName(headers.length);
  const range = encodeURIComponent(`${quoteSheetName(sheetName)}!A:${lastColumn}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  await sheetsRequest(url, token, {
    method: 'POST',
    body: JSON.stringify({ values: [row] })
  });

  return { skipped: false };
}

async function checkLandingSheet(landingPage) {
  const spreadsheetId = extractSpreadsheetId(
    landingPage.google_sheet_id || process.env.GOOGLE_SHEETS_SPREADSHEET
  );
  if (!spreadsheetId) return { ok: false, reason: 'missing_spreadsheet' };

  const credentials = loadCredentials();
  if (!credentials) return { ok: false, reason: 'missing_credentials' };

  const token = await accessToken(credentials);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties.title`;
  const spreadsheet = await sheetsRequest(url, token);
  return {
    ok: true,
    spreadsheetId,
    title: spreadsheet.properties?.title || '',
    tabs: (spreadsheet.sheets || []).map(sheet => sheet.properties?.title).filter(Boolean)
  };
}

module.exports = {
  appendLandingSubmission,
  checkLandingSheet,
  extractSpreadsheetId,
  normalizeContactFields,
  rowForHeaders,
  columnName,
  mergeRequiredHeaders
};
