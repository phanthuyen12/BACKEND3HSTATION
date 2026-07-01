const INTENT_TO_COURSE = {
  kho_bau: 'Ebook Kho Bau',
  smc: 'SMC',
  ban_do: 'Ban Do Trading',
  fin_ai_scalping: 'Fin AI Scalping',
};

const INTENT_KEYWORDS = {
  kho_bau: [
    'kho bau',
    'ebook',
    'sach trading',
    'sach ve trading',
    'tai lieu trading',
    'tu duy giao dich',
    'tam ly giao dich',
    'fomo',
  ],
  smc: [
    'smc',
    'smart money concept',
    '30 chien luoc',
    'dong tien lon',
    'quet stoploss',
    'quet stop loss',
    'phuong phap giao dich',
  ],
  ban_do: [
    'ban do',
    'lo trinh hoc',
    'nen hoc tu dau',
    'hoc tu dau',
    'nguoi moi bat dau',
    'level 0',
    'level 1',
    'level 2',
    'level 3',
    'level 4',
  ],
  fin_ai_scalping: [
    'fin ai',
    'scalping',
    'tin hieu ai',
    'dung thu',
    'trai nghiem',
    'supply',
    'demand',
  ],
};

const CONTINUATION_KEYWORDS = {
  kho_bau: [
    'gui minh',
    'gui ban',
    'dung roi',
    'fomo',
    'chua co phuong phap',
    'muon xem ebook',
    'hay fomo',
  ],
  smc: [
    'forex',
    'crypto',
    'gold',
    'da co phuong phap',
    'chua co phuong phap',
    'ket qua chua on dinh',
    'vao lenh cam tinh',
  ],
  ban_do: [
    'level 0',
    'level 1',
    'level 2',
    'level 3',
    'level 4',
    'moi bat dau',
    'chua biet gi',
    'da biet co ban',
    'quan tri von',
  ],
  fin_ai_scalping: [
    'co',
    'gui minh',
    'forex',
    'crypto',
    'gold',
    'cho minh hoi them',
    'trai nghiem',
  ],
};

const HUMAN_HANDOFF_KEYWORDS = [
  'goi cho minh',
  'goi minh',
  'lien he cho minh',
  'tu van rieng',
  'tu van them',
  'nguoi that',
  'gap nguoi that',
  'nhan vien',
  'chuyen vien',
  'sale',
  'ho tro truc tiep',
];

const GENERIC_CONTINUATION_VALUES = new Set([
  'co',
  'roi',
  'r',
  'ok',
  'oke',
  'okay',
  'uk',
  'uhm',
  'um',
  'yes',
  'no',
  'forex',
  'crypto',
  'gold',
  'gui minh nhe',
  'gui minh nha',
  'cho minh hoi them',
]);

function stripDiacritics(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPhoneNumber(value) {
  const compact = String(value || '').replace(/[\s.\-_/()]/g, '');
  const match = compact.match(/(?:\+84|84|0)(3|5|7|8|9)[0-9]{8}\b/);

  if (!match) {
    return null;
  }

  const rawPhone = match[0];
  if (rawPhone.startsWith('+84')) {
    return `0${rawPhone.slice(3)}`;
  }

  if (rawPhone.startsWith('84')) {
    return `0${rawPhone.slice(2)}`;
  }

  return rawPhone;
}

function scoreIntent(normalizedText) {
  const scores = {};

  Object.entries(INTENT_KEYWORDS).forEach(([intent, keywords]) => {
    scores[intent] = keywords.reduce((score, keyword) => {
      return normalizedText.includes(keyword) ? score + 1 : score;
    }, 0);
  });

  return scores;
}

function detectExplicitIntent(messageText) {
  const normalizedText = normalizeText(messageText);
  if (!normalizedText) {
    return null;
  }

  const scores = scoreIntent(normalizedText);
  const rankedIntents = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  return rankedIntents[0]?.[0] || null;
}

function isShortContinuationMessage(messageText) {
  const normalizedText = normalizeText(messageText);
  if (!normalizedText) {
    return false;
  }

  if (GENERIC_CONTINUATION_VALUES.has(normalizedText)) {
    return true;
  }

  if (/^level\s*[0-4]$/.test(normalizedText)) {
    return true;
  }

  return normalizedText.length <= 24 && normalizedText.split(' ').length <= 4;
}

function isIntentContinuation(previousIntent, messageText) {
  if (!previousIntent || !CONTINUATION_KEYWORDS[previousIntent]) {
    return false;
  }

  const normalizedText = normalizeText(messageText);
  if (!normalizedText) {
    return false;
  }

  if (isShortContinuationMessage(normalizedText)) {
    return true;
  }

  return CONTINUATION_KEYWORDS[previousIntent].some((keyword) => normalizedText.includes(keyword));
}

function resolveCurrentIntent(previousIntent, messageText) {
  const explicitIntent = detectExplicitIntent(messageText);

  if (explicitIntent) {
    return {
      currentIntent: explicitIntent,
      switchedIntent: explicitIntent !== previousIntent,
    };
  }

  if (previousIntent && isIntentContinuation(previousIntent, messageText)) {
    return {
      currentIntent: previousIntent,
      switchedIntent: false,
    };
  }

  return {
    currentIntent: previousIntent || null,
    switchedIntent: false,
  };
}

function compactText(value, maxLength = 240) {
  const text = String(value || '')
    .replace(/\[SPLIT\]/g, ' | ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

function buildSessionMemory(historyLogs = [], pendingTurn = null) {
  const turns = [];

  historyLogs.forEach((log) => {
    if (log.messageUser) {
      turns.push(`Khach: ${compactText(log.messageUser)}`);
    }

    if (log.messageBot) {
      turns.push(`Bot: ${compactText(log.messageBot)}`);
    }

    if (log.messageAdmin) {
      turns.push(`Admin: ${compactText(log.messageAdmin)}`);
    }
  });

  if (pendingTurn?.messageUser) {
    turns.push(`Khach: ${compactText(pendingTurn.messageUser)}`);
  }

  if (pendingTurn?.messageBot) {
    turns.push(`Bot: ${compactText(pendingTurn.messageBot)}`);
  }

  const sessionMemory = turns.slice(-6).join('\n');
  return sessionMemory.length > 1800 ? sessionMemory.slice(-1800) : sessionMemory;
}

function extractLastQuestion(answer) {
  const sanitizedAnswer = String(answer || '')
    .replace(/\[SPLIT\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!sanitizedAnswer.includes('?')) {
    return null;
  }

  const questionMatches = sanitizedAnswer.match(/[^?]*\?/g) || [];
  const lastQuestion = questionMatches[questionMatches.length - 1]?.trim();

  if (!lastQuestion) {
    return null;
  }

  return lastQuestion.slice(0, 500);
}

function inferNextStage(currentIntent, currentStage, answer) {
  if (!currentIntent) {
    return null;
  }

  const numericStage = Number.parseInt(currentStage, 10) || 1;
  const normalizedAnswer = normalizeText(answer);

  if (!normalizedAnswer) {
    return numericStage;
  }

  if (
    normalizedAnswer.includes('so dien thoai') ||
    normalizedAnswer.includes('chuyen vien') ||
    normalizedAnswer.includes('lien he ho tro')
  ) {
    return Math.max(numericStage, 6);
  }

  if (String(answer || '').includes('https://hub.aetrading.vn/')) {
    return 6;
  }

  if (
    String(answer || '').includes('drive.google.com/') ||
    String(answer || '').includes('aetrading88.notion.site/') ||
    String(answer || '').includes('finaitrading.com/static/register.html')
  ) {
    return 5;
  }

  if (numericStage < 5) {
    return numericStage + 1;
  }

  return numericStage;
}

function prepareConversationState(lead, messageText, historyLogs = []) {
  const previousIntent = lead?.currentIntent || null;
  const previousStage = Number.parseInt(lead?.currentStage, 10) || null;
  const { currentIntent, switchedIntent } = resolveCurrentIntent(previousIntent, messageText);

  let currentStage = previousStage;
  let lastQuestionAsked = lead?.lastQuestionAsked || null;

  if (currentIntent && (!currentStage || switchedIntent)) {
    currentStage = 1;
  }

  if (switchedIntent) {
    lastQuestionAsked = null;
  }

  const sessionMemory = buildSessionMemory(historyLogs);

  return {
    currentIntent,
    currentStage,
    lastQuestionAsked,
    sessionMemory,
    inputs: {
      current_intent: currentIntent || '',
      current_stage: currentStage ? String(currentStage) : '',
      last_question_asked: lastQuestionAsked || '',
      session_memory: sessionMemory || '',
    },
  };
}

function finalizeConversationState({
  currentIntent,
  currentStage,
  previousLastQuestionAsked,
  historyLogs = [],
  messageText,
  deliveredAnswer,
}) {
  const nextStage = inferNextStage(currentIntent, currentStage, deliveredAnswer);
  const lastQuestionAsked = extractLastQuestion(deliveredAnswer) || previousLastQuestionAsked || null;
  const sessionMemory = buildSessionMemory(historyLogs, {
    messageUser: messageText,
    messageBot: deliveredAnswer,
  });

  return {
    currentIntent: currentIntent || null,
    currentStage: nextStage,
    lastQuestionAsked,
    sessionMemory,
  };
}

function analyzeLeadUpdates(lead, messageText, conversationState = {}) {
  const normalizedText = normalizeText(messageText);
  const detectedPhone = extractPhoneNumber(messageText);
  const finalPhone = detectedPhone || lead?.phone || null;
  const updates = {};
  const currentStatus = lead?.leadStatus || 'new_lead';

  if (detectedPhone && detectedPhone !== lead?.phone) {
    updates.phone = detectedPhone;
  }

  const inferredCourse = INTENT_TO_COURSE[conversationState.currentIntent] || null;
  if (inferredCourse && inferredCourse !== lead?.courseInterest) {
    updates.courseInterest = inferredCourse;
  }

  const needsHuman = HUMAN_HANDOFF_KEYWORDS.some((keyword) => normalizedText.includes(keyword));

  if (finalPhone) {
    if (currentStatus !== 'ready_to_handoff') {
      updates.leadStatus = 'ready_to_handoff';
    }
    return updates;
  }

  if (needsHuman && currentStatus !== 'asked_phone') {
    updates.leadStatus = 'asked_phone';
    return updates;
  }

  return updates;
}

module.exports = {
  analyzeLeadUpdates,
  buildSessionMemory,
  extractPhoneNumber,
  finalizeConversationState,
  prepareConversationState,
};
