const OPCODES = {
  TEXT: 0x1,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xa
};

const createFrame = (opcode, payload = Buffer.alloc(0)) => {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const header = [];

  header.push(0x80 | (opcode & 0x0f));

  if (body.length < 126) {
    header.push(body.length);
  } else if (body.length < 65536) {
    header.push(126, (body.length >> 8) & 255, body.length & 255);
  } else {
    header.push(127, 0, 0, 0, 0);
    header.push(
      (body.length >> 24) & 255,
      (body.length >> 16) & 255,
      (body.length >> 8) & 255,
      body.length & 255
    );
  }

  return Buffer.concat([Buffer.from(header), body]);
};

const createJsonFrame = (payload) => createFrame(OPCODES.TEXT, Buffer.from(JSON.stringify(payload)));

const parseFrames = (buffer) => {
  const frames = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const secondByte = buffer[offset + 1];

    const fin = (firstByte & 0x80) === 0x80;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let headerLength = 2;

    if (payloadLength === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLength = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (offset + 10 > buffer.length) break;

      const high = buffer.readUInt32BE(offset + 2);
      const low = buffer.readUInt32BE(offset + 6);

      if (high !== 0) {
        throw new Error('Frame qua lon, khong duoc ho tro.');
      }

      payloadLength = low;
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const frameLength = headerLength + maskLength + payloadLength;

    if (offset + frameLength > buffer.length) break;

    const maskOffset = offset + headerLength;
    const payloadOffset = maskOffset + maskLength;
    const payload = buffer.subarray(payloadOffset, payloadOffset + payloadLength);

    let decodedPayload = payload;
    if (masked) {
      const mask = buffer.subarray(maskOffset, maskOffset + 4);
      decodedPayload = Buffer.alloc(payloadLength);
      for (let i = 0; i < payloadLength; i += 1) {
        decodedPayload[i] = payload[i] ^ mask[i % 4];
      }
    }

    frames.push({
      fin,
      opcode,
      payload: decodedPayload
    });

    offset += frameLength;
  }

  return {
    frames,
    remaining: buffer.subarray(offset)
  };
};

module.exports = {
  OPCODES,
  createFrame,
  createJsonFrame,
  parseFrames
};
