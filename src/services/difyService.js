// src/services/difyService.js

const normalizeDifyInputValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const normalizeDifyInputs = (inputs = {}) => {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(inputs).map(([key, value]) => [key, normalizeDifyInputValue(value)])
  );
};

async function sendChatMessageWithConfig({
  query,
  user,
  conversationId = null,
  difyApiKey,
  difyApiUrl = 'https://api.dify.ai/v1',
  inputs = {},
  fallbackContext = {}
}) {
  const normalizedInputs = normalizeDifyInputs(inputs);
  const normalizedLeadStatus = String(normalizedInputs?.lead_status || '').trim().toLowerCase();
  const hasPhone = normalizedInputs?.phone && String(normalizedInputs.phone).trim() !== '' && String(normalizedInputs.phone).trim().toLowerCase() !== 'chưa có' && String(normalizedInputs.phone).trim().toLowerCase() !== 'chua co';

  // Chế độ DEMO/MOCK nếu chưa cấu hình Dify API Key thực tế
  if (!difyApiKey || difyApiKey.trim() === '' || difyApiKey.includes('YOUR_') || difyApiKey.toLowerCase().includes('mock')) {
    const contextLabel = fallbackContext?.label || fallbackContext?.pageId || 'unknown';
    console.warn(`[Dify] Context ${contextLabel} chưa cấu hình Dify API Key hoặc Key ở dạng mẫu. Trả về fallback an toàn.`);

    let answer = 'Dạ em đã ghi nhận tin nhắn của mình rồi ạ. Hiện tại em chưa có đủ dữ liệu AI để trả lời chính xác từ kho nội dung, nên em sẽ chuyển chuyên viên hỗ trợ mình kỹ hơn nhé.';
    if (hasPhone || normalizedLeadStatus === 'ready_to_handoff' || normalizedLeadStatus === 'asked_phone') {
      answer = 'Dạ em đã ghi nhận thông tin của mình rồi ạ. Chuyên viên tư vấn sẽ liên hệ hỗ trợ mình sớm nhé.';
    }

    const mockConvId = conversationId || `mock_conv_${Date.now()}`;
    return {
      answer,
      conversationId: mockConvId
    };
  }

  const endpoint = `${difyApiUrl.replace(/\/$/, '')}/chat-messages`;
  
  try {
    const payload = {
      inputs: normalizedInputs,
      query: query,
      response_mode: 'blocking',
      user: user
    };

    if (conversationId && String(conversationId).trim() !== '') {
      payload.conversation_id = String(conversationId).trim();
    }

    console.log(`[Dify] Calling Dify API at ${endpoint} for user ${user}, conversation_id: ${conversationId}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Dify API Error]', data);
      throw new Error(data.message || data.error || `Dify API error: ${response.status}`);
    }

    return {
      answer: data.answer,
      conversationId: data.conversation_id
    };
  } catch (error) {
    console.error('[Dify] Lỗi khi gọi Dify API:', error);
    throw error;
  }
}

/**
 * Gửi tin nhắn đến Dify Chat API
 * @param {Object} params
 * @param {string} params.query - Nội dung tin nhắn khách gửi
 * @param {string} params.facebookUserId - ID khách hàng trên Facebook
 * @param {string} params.conversationId - ID cuộc hội thoại cũ từ Dify (nếu có)
 * @param {Object} params.page - Object cấu hình của Facebook Page chứa API key và API url
 * @param {Object} params.inputs - Các tham số đầu vào bổ sung (như lead_status)
 * @returns {Promise<{answer: string, conversationId: string}>}
 */
async function sendChatMessage({ query, facebookUserId, conversationId = null, page, inputs = {} }) {
  return sendChatMessageWithConfig({
    query,
    user: facebookUserId,
    conversationId,
    difyApiKey: page?.difyApiKey,
    difyApiUrl: page?.difyApiUrl || 'https://api.dify.ai/v1',
    inputs,
    fallbackContext: {
      pageId: page?.pageId,
      label: page?.pageName || page?.pageId || 'facebook-page'
    }
  });
}

module.exports = {
  sendChatMessage,
  sendChatMessageWithConfig
};
