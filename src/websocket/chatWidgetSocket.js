const crypto = require('crypto');
const { verifyToken } = require('../utils/jwt');
const sessionService = require('../services/sessionService');
const userService = require('../services/userService');
const webChatService = require('../services/webChatService');
const { OPCODES, createFrame, createJsonFrame, parseFrames } = require('./frame');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const sendJson = (socket, payload) => {
  if (!socket || socket.destroyed || !socket.writable) return;
  socket.write(createJsonFrame(payload));
};

const sendError = (socket, message, meta = {}) => {
  sendJson(socket, {
    type: 'ERROR',
    message,
    ...meta
  });
};

const buildSessionId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
};

const handleMessage = async (socket, state, payload) => {
  if (!payload || typeof payload !== 'object') {
    sendError(socket, 'Payload websocket không hợp lệ.');
    return;
  }

  switch (payload.type) {
    case 'init': {
      state.sourcePage = String(payload.page || state.sourcePage || '').trim();
      state.userProfile = {
        ...state.userProfile,
        ...(payload.userProfile && typeof payload.userProfile === 'object' ? payload.userProfile : {})
      };

      sendJson(socket, {
        type: 'INIT_ACK',
        sessionId: state.sessionId
      });
      return;
    }

    case 'select_topic': {
      const topicId = String(payload.topicId || '').trim();
      const topic = await webChatService.getTopicById(topicId);

      if (!topic) {
        sendError(socket, 'Topic không tồn tại hoặc đã bị tắt.', { topicId });
        return;
      }

      state.selectedTopicId = topic.id;
      sendJson(socket, {
        type: 'TOPIC_SELECTED',
        topicId: topic.id,
        openingMessage: topic.openingMessage || null
      });
      return;
    }

    case 'user_message': {
      const topicId = String(payload.topicId || state.selectedTopicId || '').trim();
      const message = String(payload.message || '').trim();

      if (!topicId) {
        sendError(socket, 'Vui lòng chọn topic trước khi chat.');
        return;
      }

      if (!message) {
        sendError(socket, 'Nội dung tin nhắn không được để trống.', { topicId });
        return;
      }

      await webChatService.createHistoryLog({
        sessionId: state.sessionId,
        topicId,
        topicLabel: state.topicLabelMap?.[topicId] || null,
        sourcePage: state.sourcePage,
        role: 'user',
        eventType: 'message',
        message,
        contactName: state.userProfile?.name || null,
        contactPhone: state.userProfile?.phone || null,
        contactEmail: state.userProfile?.email || null
      });

      state.selectedTopicId = topicId;
      sendJson(socket, { type: 'ASSISTANT_TYPING', topicId, active: true });

      try {
        const response = await webChatService.sendTopicMessage({
          topicId,
          message,
          sessionId: state.sessionId,
          conversationId: state.conversationMap[topicId] || payload.conversationId || null,
          sourcePage: state.sourcePage,
          userProfile: state.userProfile,
          authUser: state.authUser
        });

        if (response.conversationId) {
          state.conversationMap[topicId] = response.conversationId;
        }

        await webChatService.createHistoryLog({
          sessionId: state.sessionId,
          topicId,
          topicLabel: response.topic?.label || state.topicLabelMap?.[topicId] || null,
          sourcePage: state.sourcePage,
          role: 'assistant',
          eventType: 'message',
          message: response.answer,
          difyConversationId: response.conversationId || null,
          contactName: state.userProfile?.name || null,
          contactPhone: state.userProfile?.phone || null,
          contactEmail: state.userProfile?.email || null
        });

        sendJson(socket, {
          type: 'ASSISTANT_MESSAGE',
          topicId,
          message: response.answer,
          conversationId: response.conversationId || null,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        sendError(
          socket,
          error.message || 'Không thể xử lý tin nhắn với Dify lúc này.',
          { topicId }
        );
      } finally {
        sendJson(socket, { type: 'ASSISTANT_TYPING', topicId, active: false });
      }
      return;
    }

    case 'submit_lead': {
      const topicId = String(payload.topicId || state.selectedTopicId || '').trim();
      if (!topicId) {
        sendError(socket, 'Vui lòng chọn topic trước khi để lại thông tin.');
        return;
      }

      sendJson(socket, { type: 'LEAD_SUBMITTING', topicId, active: true });

      try {
        const result = await webChatService.submitLeadCapture({
          topicId,
          lead: payload.lead || {},
          sessionId: state.sessionId,
          sourcePage: state.sourcePage,
          authUser: state.authUser
        });

        state.userProfile = {
          ...state.userProfile,
          ...(payload.lead && typeof payload.lead === 'object' ? payload.lead : {})
        };

        sendJson(socket, {
          type: 'LEAD_CAPTURED',
          topicId,
          requestId: result.requestId,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        sendError(socket, error.message || 'Không thể lưu thông tin lúc này.', { topicId });
      } finally {
        sendJson(socket, { type: 'LEAD_SUBMITTING', topicId, active: false });
      }
      return;
    }

    default:
      sendError(socket, `Loại message "${payload.type}" chưa được hỗ trợ.`);
  }
};

const attachChatWidgetSocket = (server) => {
  server.on('upgrade', async (req, socket) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/ws/chat-widget') return;

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const accept = crypto
      .createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n'
    ].join('\r\n'));

    const token = String(url.searchParams.get('token') || '').trim();
    let authUser = null;

    if (token) {
      try {
        const decoded = verifyToken(token);
        if (sessionService.ensureSession(decoded.userId, decoded.sessionId)) {
          authUser = await userService.getUserById(decoded.userId);
        }
      } catch (_error) {
        authUser = null;
      }
    }

    const state = {
      sessionId: String(url.searchParams.get('sessionId') || '').trim() || buildSessionId(),
      sourcePage: String(url.searchParams.get('page') || '').trim(),
      selectedTopicId: '',
      conversationMap: {},
      topicLabelMap: {},
      userProfile: {},
      authUser
    };

    let buffer = Buffer.alloc(0);

    sendJson(socket, {
      type: 'SESSION_READY',
      sessionId: state.sessionId
    });

    socket.on('data', async (chunk) => {
      try {
        buffer = Buffer.concat([buffer, chunk]);
        const parsed = parseFrames(buffer);
        buffer = parsed.remaining;

        for (const frame of parsed.frames) {
          if (!frame.fin) {
            sendError(socket, 'Không hỗ trợ websocket frame bị chia nhỏ.');
            continue;
          }

          if (frame.opcode === OPCODES.CLOSE) {
            socket.end(createFrame(OPCODES.CLOSE));
            return;
          }

          if (frame.opcode === OPCODES.PING) {
            socket.write(createFrame(OPCODES.PONG, frame.payload));
            continue;
          }

          if (frame.opcode !== OPCODES.TEXT) {
            continue;
          }

          let payload;
          try {
            payload = JSON.parse(frame.payload.toString('utf8'));
          } catch (_error) {
            sendError(socket, 'Không đọc được dữ liệu JSON từ client.');
            continue;
          }

          if (payload?.type === 'select_topic' && payload?.topicId) {
            const topic = await webChatService.getTopicById(String(payload.topicId).trim());
            if (topic) {
              state.topicLabelMap[String(payload.topicId).trim()] = topic.label;
            }
          }

          await handleMessage(socket, state, payload);
        }
      } catch (error) {
        console.error('[WebChatSocket] Error:', error);
        sendError(socket, error.message || 'Lỗi websocket nội bộ.');
      }
    });

    socket.on('error', (error) => {
      if (error.code === 'EPIPE' || error.code === 'ECONNRESET') return;
      console.warn('[WebChatSocket] Socket error:', error.message);
    });
  });
};

module.exports = {
  attachChatWidgetSocket
};
