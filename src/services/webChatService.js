const configModel = require('../models/configModel');
const supportModel = require('../models/supportModel');
const webChatLogModel = require('../models/webChatLogModel');
const userCourseService = require('./userCourseService');
const publicCourseModel = require('../models/elearning/courseModel');
const { sendChatMessageWithConfig } = require('./difyService');

const CHAT_WIDGET_CONFIG_KEY = 'ai_chat_widget_config';
const DEFAULT_DIFY_URL = 'https://api.dify.ai/v1';
const COURSE_CATALOG_LIMIT = 50;
const COURSE_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

let systemCourseCatalogCache = {
  expiresAt: 0,
  value: null
};

const DEFAULT_WIDGET_CONFIG = {
  enabled: true,
  assistantName: 'Trợ lý Team OS x AI',
  assistantSubtitle: 'Trực tuyến · trả lời 24/7',
  avatarEmoji: '🤖',
  welcomeMessage:
    'Chào anh/chị. Em là trợ lý AI của Team OS. Anh/chị có thể bấm nhanh một topic bên dưới hoặc nhập câu hỏi để em hỗ trợ ngay.',
  inputPlaceholder: 'Nhập nội dung cần hỏi...',
  sendButtonLabel: 'Gửi',
  leadButtonLabel: 'Giữ chỗ / Để lại thông tin',
  leadTitle: 'Để lại thông tin',
  leadDescription: 'Đội ngũ sẽ liên hệ lại để tư vấn kỹ hơn cho mình.',
  leadSuccessMessage:
    'Em đã ghi nhận thông tin của mình rồi. Đội ngũ tư vấn sẽ liên hệ trong thời gian sớm nhất nhé.',
  difyApiUrl: DEFAULT_DIFY_URL,
  difyApiKey: '',
  enableNativeUserContext: true,
  topics: [
    {
      id: 'tong-quan-bootcamp',
      label: 'Bootcamp là gì?',
      description: 'Tổng quan chương trình',
      starterQuestion: 'Bootcamp là gì?',
      openingMessage: 'Em sẵn sàng giải thích tổng quan chương trình cho mình.',
      difyInputs: {
        topic_code: 'tong-quan-bootcamp'
      },
      enabled: true
    },
    {
      id: 'hoc-phi',
      label: 'Giá bao nhiêu?',
      description: 'Thông tin học phí',
      starterQuestion: 'Giá bao nhiêu?',
      openingMessage: 'Em có thể giải thích học phí và các mức ưu đãi hiện có.',
      difyInputs: {
        topic_code: 'hoc-phi'
      },
      enabled: true
    },
    {
      id: 'thoi-gian-dia-diem',
      label: 'Khi nào, ở đâu?',
      description: 'Lịch học và địa điểm',
      starterQuestion: 'Khi nào, ở đâu?',
      openingMessage: 'Em gửi mình thông tin lịch và địa điểm ngay đây.',
      difyInputs: {
        topic_code: 'thoi-gian-dia-diem'
      },
      enabled: true
    }
  ]
};

const LEGACY_TEXT_MAP = new Map([
  ['Tro ly Team OS x AI', 'Trợ lý Team OS x AI'],
  ['Truc tuyen · tra loi 24/7', 'Trực tuyến · trả lời 24/7'],
  ['Chao anh/chi. Em la tro ly AI cua Team OS. Anh/chi co the bam nhanh mot topic ben duoi hoac nhap cau hoi de em ho tro ngay.', 'Chào anh/chị. Em là trợ lý AI của Team OS. Anh/chị có thể bấm nhanh một topic bên dưới hoặc nhập câu hỏi để em hỗ trợ ngay.'],
  ['Nhap noi dung can hoi...', 'Nhập nội dung cần hỏi...'],
  ['Gui', 'Gửi'],
  ['Giu cho / De lai thong tin', 'Giữ chỗ / Để lại thông tin'],
  ['De lai thong tin', 'Để lại thông tin'],
  ['Doi ngu se lien he lai de tu van ky hon cho minh.', 'Đội ngũ sẽ liên hệ lại để tư vấn kỹ hơn cho mình.'],
  ['Em da ghi nhan thong tin cua minh roi. Doi ngu tu van se lien he trong thoi gian som nhat nhe.', 'Em đã ghi nhận thông tin của mình rồi. Đội ngũ tư vấn sẽ liên hệ trong thời gian sớm nhất nhé.'],
  ['Bootcamp la gi?', 'Bootcamp là gì?'],
  ['Tong quan chuong trinh', 'Tổng quan chương trình'],
  ['Em san sang giai thich tong quan chuong trinh cho minh.', 'Em sẵn sàng giải thích tổng quan chương trình cho mình.'],
  ['Gia bao nhieu?', 'Giá bao nhiêu?'],
  ['Thong tin hoc phi', 'Thông tin học phí'],
  ['Em co the giai thich hoc phi va cac muc uu dai hien co.', 'Em có thể giải thích học phí và các mức ưu đãi hiện có.'],
  ['Khi nao, o dau?', 'Khi nào, ở đâu?'],
  ['Lich hoc va dia diem', 'Lịch học và địa điểm'],
  ['Em gui minh thong tin lich va dia diem ngay day.', 'Em gửi mình thông tin lịch và địa điểm ngay đây.']
]);

const withAccents = (value, fallback = '') => {
  const raw = String(value ?? fallback ?? '').trim();
  if (!raw) return raw;
  return LEGACY_TEXT_MAP.get(raw) || raw;
};

const parseJsonSafely = (value, fallback) => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const slugify = (value, fallback) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
};

const normalizeObject = (value) => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') return parseJsonSafely(value, {});
  return {};
};

const normalizeLevelLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'beginner') return 'Cơ bản';
  if (normalized === 'intermediate') return 'Trung cấp';
  if (normalized === 'advanced') return 'Nâng cao';
  return normalized || '';
};

const formatPriceLabel = (value, isFree = false) => {
  const amount = Number(value || 0);
  if (isFree || amount <= 0) {
    return 'Miễn phí';
  }

  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
};

const normalizeTopic = (topic, index) => {
  const label = String(topic?.label || `Topic ${index + 1}`).trim();
  const id = slugify(topic?.id || label, `topic-${index + 1}`);

  return {
    id,
    label: withAccents(label),
    description: withAccents(topic?.description || ''),
    starterQuestion: withAccents(topic?.starterQuestion || label),
    openingMessage: withAccents(topic?.openingMessage || ''),
    difyApiUrl: String(topic?.difyApiUrl || DEFAULT_DIFY_URL).trim() || DEFAULT_DIFY_URL,
    difyApiKey: String(topic?.difyApiKey || '').trim(),
    difyInputs: normalizeObject(topic?.difyInputs),
    enabled: normalizeBoolean(topic?.enabled, true)
  };
};

const normalizeWidgetConfig = (rawConfig = {}) => {
  const merged = {
    ...DEFAULT_WIDGET_CONFIG,
    ...rawConfig
  };

  const rawTopics = Array.isArray(rawConfig?.topics) && rawConfig.topics.length > 0
    ? rawConfig.topics
    : DEFAULT_WIDGET_CONFIG.topics;

  const legacyDifyApiUrl = rawTopics.find((topic) => topic?.difyApiUrl)?.difyApiUrl;
  const legacyDifyApiKey = rawTopics.find((topic) => topic?.difyApiKey)?.difyApiKey;

  return {
    enabled: normalizeBoolean(merged.enabled, true),
    assistantName: withAccents(merged.assistantName || DEFAULT_WIDGET_CONFIG.assistantName),
    assistantSubtitle: withAccents(merged.assistantSubtitle || DEFAULT_WIDGET_CONFIG.assistantSubtitle),
    avatarEmoji: String(merged.avatarEmoji || DEFAULT_WIDGET_CONFIG.avatarEmoji).trim() || DEFAULT_WIDGET_CONFIG.avatarEmoji,
    welcomeMessage: withAccents(merged.welcomeMessage || DEFAULT_WIDGET_CONFIG.welcomeMessage),
    inputPlaceholder: withAccents(merged.inputPlaceholder || DEFAULT_WIDGET_CONFIG.inputPlaceholder),
    sendButtonLabel: withAccents(merged.sendButtonLabel || DEFAULT_WIDGET_CONFIG.sendButtonLabel),
    leadButtonLabel: withAccents(merged.leadButtonLabel || DEFAULT_WIDGET_CONFIG.leadButtonLabel),
    leadTitle: withAccents(merged.leadTitle || DEFAULT_WIDGET_CONFIG.leadTitle),
    leadDescription: withAccents(merged.leadDescription || DEFAULT_WIDGET_CONFIG.leadDescription),
    leadSuccessMessage: withAccents(merged.leadSuccessMessage || DEFAULT_WIDGET_CONFIG.leadSuccessMessage),
    difyApiUrl: String(merged.difyApiUrl || legacyDifyApiUrl || DEFAULT_WIDGET_CONFIG.difyApiUrl).trim() || DEFAULT_DIFY_URL,
    difyApiKey: String(merged.difyApiKey || legacyDifyApiKey || DEFAULT_WIDGET_CONFIG.difyApiKey).trim(),
    enableNativeUserContext: normalizeBoolean(merged.enableNativeUserContext, true),
    topics: rawTopics.map(normalizeTopic)
  };
};

const sanitizePublicTopic = (topic) => ({
  id: topic.id,
  label: topic.label,
  description: topic.description,
  starterQuestion: topic.starterQuestion,
  openingMessage: topic.openingMessage,
  enabled: topic.enabled
});

const sanitizePublicConfig = (config) => ({
  enabled: config.enabled,
  assistantName: config.assistantName,
  assistantSubtitle: config.assistantSubtitle,
  avatarEmoji: config.avatarEmoji,
  welcomeMessage: config.welcomeMessage,
  inputPlaceholder: config.inputPlaceholder,
  sendButtonLabel: config.sendButtonLabel,
  leadButtonLabel: config.leadButtonLabel,
  leadTitle: config.leadTitle,
  leadDescription: config.leadDescription,
  leadSuccessMessage: config.leadSuccessMessage,
  topics: config.topics.filter((topic) => topic.enabled).map(sanitizePublicTopic)
});

const loadAdminConfig = async () => {
  const allConfigs = await configModel.getAllConfigs();
  const rawConfig = parseJsonSafely(allConfigs[CHAT_WIDGET_CONFIG_KEY], DEFAULT_WIDGET_CONFIG);
  return normalizeWidgetConfig(rawConfig);
};

const saveAdminConfig = async (payload) => {
  const normalized = normalizeWidgetConfig(payload);

  await configModel.updateConfigs({
    [CHAT_WIDGET_CONFIG_KEY]: JSON.stringify(normalized)
  });

  return normalized;
};

const getPublicConfig = async () => sanitizePublicConfig(await loadAdminConfig());

const buildNativeUserContext = async (authUser) => {
  if (!authUser?.id) {
    return {
      isLoggedIn: false,
      userId: '',
      name: '',
      email: '',
      phone: '',
      role: 'guest',
      rankId: '',
      courseCount: 0,
      courseTitles: [],
      courseSummary: '',
      courses: []
    };
  }

  let userCourses = [];
  try {
    userCourses = await userCourseService.listUserCourses(authUser.id);
  } catch (error) {
    console.warn(`[WebChat] Không thể tải khóa học của user ${authUser.id}: ${error.message}`);
  }

  const courses = userCourses.slice(0, 12).map((item) => ({
    id: String(item.course?.id || item.course_id || ''),
    title: String(item.course?.title || item.title || '').trim(),
    category: String(item.course?.category_name || item.category_name || '').trim(),
    progress: Number(item.progress || item.completion_percent || 0),
    totalLessons: Number(item.total_lessons || item.course?.lessons || 0),
    completedLessons: Number(item.completed_lessons || 0),
    lastWatchedAt: item.last_watched_at || null,
    updatedAt: item.updated_at || null
  })).filter((course) => course.id || course.title);

  const courseTitles = courses.map((course) => course.title).filter(Boolean);
  const courseSummary = courses.length
    ? courses
      .map((course) => `${course.title} (${course.progress || 0}%${course.category ? ` - ${course.category}` : ''})`)
      .join(' | ')
    : '';

  return {
    isLoggedIn: true,
    userId: String(authUser.id),
    name: String(authUser.name || '').trim(),
    email: String(authUser.email || '').trim(),
    phone: String(authUser.phone || '').trim(),
    role: String(authUser.role || 'user').trim(),
    rankId: authUser.rank_id !== undefined && authUser.rank_id !== null ? String(authUser.rank_id) : '',
    courseCount: courses.length,
    courseTitles,
    courseSummary,
    courses
  };
};

const buildSystemCourseCatalog = async () => {
  const now = Date.now();
  if (systemCourseCatalogCache.value && systemCourseCatalogCache.expiresAt > now) {
    return systemCourseCatalogCache.value;
  }

  let rows = [];
  try {
    rows = await publicCourseModel.listCourses({
      status: 'active',
      limit: COURSE_CATALOG_LIMIT,
      offset: 0
    });
  } catch (error) {
    console.warn(`[WebChat] Không thể tải course catalog: ${error.message}`);
  }

  const courses = rows
    .map((course) => {
      const title = String(course?.title || '').trim();
      if (!title) return null;

      const isFree = Boolean(course?.is_free) || Number(course?.price || 0) <= 0;
      const category = String(course?.category_name || '').trim();
      const level = String(course?.level || '').trim();

      return {
        id: String(course.id || ''),
        title,
        shortDescription: String(course?.short_description || '').trim(),
        description: String(course?.description || '').trim(),
        category,
        isFree,
        price: Number(course?.price || 0),
        priceText: formatPriceLabel(course?.price, isFree),
        level,
        levelLabel: normalizeLevelLabel(level),
        duration: String(course?.duration || '').trim(),
        lessons: Number(course?.lessons || 0),
        thumbnail: String(course?.thumbnail_url || '').trim()
      };
    })
    .filter(Boolean);

  const categories = [...new Set(courses.map((course) => course.category).filter(Boolean))];
  const courseTitles = courses.map((course) => course.title);
  const courseSummary = courses.length
    ? courses
      .map((course) => {
        const parts = [
          course.title,
          course.category || null,
          course.priceText || null,
          course.levelLabel || null
        ].filter(Boolean);

        return `${parts[0]} (${parts.slice(1).join(' - ')})`;
      })
      .join(' | ')
    : '';

  const value = {
    generatedAt: new Date().toISOString(),
    courseCount: courses.length,
    categoryCount: categories.length,
    categories,
    courseTitles,
    courseSummary,
    courses
  };

  systemCourseCatalogCache = {
    value,
    expiresAt: now + COURSE_CATALOG_CACHE_TTL_MS
  };

  return value;
};

const buildDifyInputs = ({
  config,
  topic,
  sourcePage,
  userProfile,
  authUser,
  extraInputs = {}
}) => {
  const visitorName = String(userProfile?.name || authUser?.name || '').trim();
  const visitorPhone = String(userProfile?.phone || authUser?.phone || '').trim();
  const visitorEmail = String(userProfile?.email || authUser?.email || '').trim();

  const baseInputs = {
    ...topic.difyInputs,
    topic_id: topic.id,
    topic_label: topic.label,
    topic_description: topic.description,
    source_page: sourcePage || 'ai-chat-widget',
    visitor_name: visitorName,
    visitor_phone: visitorPhone,
    visitor_email: visitorEmail,
    visitor_user_id: authUser?.id ? String(authUser.id) : '',
    visitor_is_logged_in: authUser?.id ? 'true' : 'false',
    ...extraInputs
  };

  return Promise.resolve().then(async () => {
    const courseCatalog = await buildSystemCourseCatalog();
    const inputsWithCatalog = {
      ...baseInputs,
      system_course_catalog: courseCatalog,
      system_course_catalog_json: JSON.stringify(courseCatalog),
      system_course_count: courseCatalog.courseCount || 0,
      system_course_categories: (courseCatalog.categories || []).join(' | '),
      system_course_titles: (courseCatalog.courseTitles || []).join(' | '),
      system_course_summary: courseCatalog.courseSummary || ''
    };

    if (!config.enableNativeUserContext) {
      return inputsWithCatalog;
    }

    const nativeContext = await buildNativeUserContext(authUser);
    return {
      ...inputsWithCatalog,
      native_user_context: nativeContext,
      native_user_context_json: JSON.stringify(nativeContext),
      visitor_user_name: nativeContext.name || visitorName,
      visitor_user_email: nativeContext.email || visitorEmail,
      visitor_user_phone: nativeContext.phone || visitorPhone,
      visitor_role: nativeContext.role || 'guest',
      visitor_rank_id: nativeContext.rankId || '',
      visitor_course_count: nativeContext.courseCount || 0,
      visitor_course_titles: (nativeContext.courseTitles || []).join(' | '),
      visitor_courses_summary: nativeContext.courseSummary || ''
    };
  });
};

const getTopicById = async (topicId) => {
  const config = await loadAdminConfig();
  const topic = config.topics.find((item) => item.id === topicId && item.enabled);
  return topic || null;
};

const createFallbackLeadEmail = ({ phone, topicId, sessionId }) => {
  const phoneTail = String(phone || '').replace(/\D/g, '').slice(-8) || 'guest';
  const sessionTail = String(sessionId || '').replace(/[^a-z0-9]/gi, '').slice(-8) || Date.now();
  return `${topicId || 'chat'}-${phoneTail}-${sessionTail}@chat-widget.local`;
};

const createHistoryLog = async (payload) => webChatLogModel.createLog(payload);

const getAdminHistory = async ({ page = 1, limit = 20, topicId, sessionId, role, eventType, search, sourcePage }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (currentPage - 1) * take;

  const items = await webChatLogModel.listLogs({
    topicId,
    sessionId,
    role,
    eventType,
    search,
    sourcePage,
    limit: take,
    offset
  });

  const total = await webChatLogModel.countLogs({
    topicId,
    sessionId,
    role,
    eventType,
    search,
    sourcePage
  });

  return {
    data: items,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getAdminHistoryStats = async () => {
  const stats = await webChatLogModel.getStats();
  return {
    totalMessages: Number(stats.total_messages || 0),
    totalSessions: Number(stats.total_sessions || 0),
    totalUserMessages: Number(stats.total_user_messages || 0),
    totalAssistantMessages: Number(stats.total_assistant_messages || 0),
    totalLeads: Number(stats.total_leads || 0)
  };
};

const submitLeadCapture = async ({ topicId, lead, sessionId, sourcePage, authUser }) => {
  const config = await loadAdminConfig();
  const topic = config.topics.find((item) => item.id === topicId && item.enabled);

  if (!topic) {
    throw new Error('Topic không tồn tại hoặc đã bị tắt.');
  }

  const name = String(lead?.name || '').trim();
  const phone = String(lead?.phone || '').trim();
  const email = String(lead?.email || '').trim();
  const note = String(lead?.note || '').trim();

  if (!name || !phone) {
    throw new Error('Vui lòng nhập đầy đủ họ tên và số điện thoại.');
  }

  const supportRequest = await supportModel.createSupportRequest({
    name,
    email: email || createFallbackLeadEmail({ phone, topicId, sessionId }),
    phone,
    topic: `${topic.label} - Lead từ AI Chat`,
    message:
      note ||
      `Khách hàng để lại thông tin từ widget AI chat. Topic: ${topic.label}. Số điện thoại: ${phone}.`,
    sourcePage: sourcePage || 'ai-chat-widget',
    refCode: null,
    redirectUrl: null
  });

  let assistantReply = config.leadSuccessMessage;

  const effectiveDifyApiUrl = config.difyApiUrl || topic.difyApiUrl || DEFAULT_DIFY_URL;
  const effectiveDifyApiKey = config.difyApiKey || topic.difyApiKey || '';

  if (effectiveDifyApiKey) {
    try {
      const inputs = await buildDifyInputs({
        config,
        topic,
        sourcePage,
        userProfile: { name, phone, email },
        authUser,
        extraInputs: {
          lead_name: name,
          lead_phone: phone,
          lead_email: email || '',
          lead_note: note || ''
        }
      });

      const difyResult = await sendChatMessageWithConfig({
        query: `Khách vừa để lại thông tin từ topic "${topic.label}". Họ tên: ${name}. Số điện thoại: ${phone}.${email ? ` Email: ${email}.` : ''}${note ? ` Nhu cầu thêm: ${note}.` : ''} Hãy gửi một lời xác nhận ngắn gọn và thân thiện.`,
        user: `${sessionId || 'chat-widget'}::lead`,
        conversationId: null,
        difyApiKey: effectiveDifyApiKey,
        difyApiUrl: effectiveDifyApiUrl,
        inputs
      });

      if (difyResult?.answer) {
        assistantReply = difyResult.answer;
      }
    } catch (error) {
      console.warn(`[WebChat] Không thể gọi Dify cho lead topic ${topic.id}: ${error.message}`);
    }
  }

  await createHistoryLog({
    sessionId,
    topicId: topic.id,
    topicLabel: topic.label,
    sourcePage: sourcePage || 'ai-chat-widget',
    role: 'lead',
    eventType: 'lead_capture',
    message: note || `Khách để lại thông tin ở topic "${topic.label}".`,
    contactName: name,
    contactPhone: phone,
    contactEmail: email || null,
    metadata: {
      supportRequestId: supportRequest?.id || null
    }
  });

  return {
    requestId: supportRequest?.id || null,
    message: assistantReply,
    topic: sanitizePublicTopic(topic)
  };
};

const sendTopicMessage = async ({
  topicId,
  message,
  sessionId,
  conversationId,
  sourcePage,
  userProfile,
  authUser
}) => {
  const config = await loadAdminConfig();
  const topic = config.topics.find((item) => item.id === topicId && item.enabled);

  if (!topic) {
    throw new Error('Topic không tồn tại hoặc đã bị tắt.');
  }

  const query = String(message || '').trim();
  if (!query) {
    throw new Error('Nội dung tin nhắn không được để trống.');
  }

  const effectiveDifyApiUrl = config.difyApiUrl || topic.difyApiUrl || DEFAULT_DIFY_URL;
  const effectiveDifyApiKey = config.difyApiKey || topic.difyApiKey || '';

  const inputs = await buildDifyInputs({
    config,
    topic,
    sourcePage,
    userProfile,
    authUser
  });

  const difyResult = await sendChatMessageWithConfig({
    query,
    user: `${sessionId || 'chat-widget'}::${topic.id}`,
    conversationId: conversationId || null,
    difyApiKey: effectiveDifyApiKey,
    difyApiUrl: effectiveDifyApiUrl,
    inputs
  });

  return {
    answer: difyResult.answer,
    conversationId: difyResult.conversationId,
    topic: sanitizePublicTopic(topic)
  };
};

module.exports = {
  CHAT_WIDGET_CONFIG_KEY,
  DEFAULT_WIDGET_CONFIG,
  loadAdminConfig,
  saveAdminConfig,
  getPublicConfig,
  getTopicById,
  createHistoryLog,
  getAdminHistory,
  getAdminHistoryStats,
  submitLeadCapture,
  sendTopicMessage
};
