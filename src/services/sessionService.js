const crypto = require('crypto');

const activeSessions = new Map();
const userSockets = new Map();

const createSession = (userId) => {
  const normalizedUserId = String(userId);
  const previousSession = activeSessions.get(normalizedUserId);
  const sessionId = crypto.randomBytes(24).toString('hex');

  activeSessions.set(normalizedUserId, {
    sessionId,
    createdAt: new Date().toISOString()
  });

  notifyUser(normalizedUserId, {
    type: 'SESSION_REPLACED',
    sessionId,
    previousSessionId: previousSession?.sessionId || null,
    message: 'Tài khoản của bạn đã đăng nhập trên thiết bị khác.'
  }, previousSession?.sessionId);

  return sessionId;
};

const isSessionActive = (userId, sessionId) => {
  if (!userId || !sessionId) return false;
  const current = activeSessions.get(String(userId));
  return current?.sessionId === sessionId;
};

const clearSession = (userId, sessionId) => {
  if (!userId) return;
  const normalizedUserId = String(userId);
  const current = activeSessions.get(normalizedUserId);

  if (!sessionId || current?.sessionId === sessionId) {
    activeSessions.delete(normalizedUserId);
  }
};

const registerSocket = (userId, sessionId, socket) => {
  const normalizedUserId = String(userId);
  const sockets = userSockets.get(normalizedUserId) || new Set();
  socket.__sessionId = sessionId;
  sockets.add(socket);
  userSockets.set(normalizedUserId, sockets);

  socket.on('close', () => {
    sockets.delete(socket);
    if (sockets.size === 0) {
      userSockets.delete(normalizedUserId);
    }
  });
};

const notifyUser = (userId, payload, targetSessionId) => {
  const sockets = userSockets.get(String(userId));
  if (!sockets) return;

  sockets.forEach((socket) => {
    if (targetSessionId && socket.__sessionId !== targetSessionId) return;
    sendSocketMessage(socket, payload);
  });
};

const sendSocketMessage = (socket, payload) => {
  if (!socket || socket.destroyed || !socket.writable) return;
  const message = Buffer.from(JSON.stringify(payload));
  const header = [];

  header.push(0x81);
  if (message.length < 126) {
    header.push(message.length);
  } else if (message.length < 65536) {
    header.push(126, (message.length >> 8) & 255, message.length & 255);
  } else {
    header.push(127, 0, 0, 0, 0);
    header.push(
      (message.length >> 24) & 255,
      (message.length >> 16) & 255,
      (message.length >> 8) & 255,
      message.length & 255
    );
  }

  socket.write(Buffer.concat([Buffer.from(header), message]));
};

module.exports = {
  createSession,
  isSessionActive,
  clearSession,
  registerSocket,
  sendSocketMessage
};
