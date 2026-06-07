const crypto = require('crypto');
const { verifyToken } = require('../utils/jwt');
const sessionService = require('../services/sessionService');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const attachSessionSocket = (server) => {
  server.on('upgrade', (req, socket) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/ws/session') return;

    const token = url.searchParams.get('token');
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    if (!sessionService.isSessionActive(decoded.userId, decoded.sessionId)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

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

    sessionService.registerSocket(decoded.userId, decoded.sessionId, socket);
    sessionService.sendSocketMessage(socket, {
      type: 'SESSION_CONNECTED',
      sessionId: decoded.sessionId
    });

    socket.on('data', (chunk) => {
      if (chunk[0] === 0x88) {
        socket.end();
      }
    });
  });
};

module.exports = {
  attachSessionSocket
};
