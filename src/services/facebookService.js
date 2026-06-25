// src/services/facebookService.js
const FacebookPage = require('../models/facebook/FacebookPage');
const FacebookPost = require('../models/facebook/FacebookPost');
const FacebookLead = require('../models/facebook/FacebookLead');

const GRAPH_TIMEOUT_MS = 15000;
const DEFAULT_POST_LIMIT = 25;
const MAX_POST_LIMIT = 500;
const DEFAULT_GRAPH_PAGE_LIMIT = 100;
const MAX_GRAPH_PAGE_LIMIT = 100;
const MAX_POST_PAGING_REQUESTS = 20;
const VIDEO_VIEWS_CACHE_TTL_MS = 10 * 60 * 1000;

const videoViewsCache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chunk = (items, size) => {
  const groups = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on', 'all'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;

  return fallback;
};

const uniqueValues = (items) => [...new Set(items.filter(Boolean).map(String))];

const getCachedVideoViews = (objectId) => {
  const cacheKey = String(objectId || '');
  if (!cacheKey) return undefined;

  const cached = videoViewsCache.get(cacheKey);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    videoViewsCache.delete(cacheKey);
    return undefined;
  }

  return cached.value;
};

const setCachedVideoViews = (objectId, value) => {
  const cacheKey = String(objectId || '');
  if (!cacheKey) return;

  videoViewsCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + VIDEO_VIEWS_CACHE_TTL_MS,
  });
};

const extractNumericIdsFromText = (value) => {
  if (!value || typeof value !== 'string') return [];
  const matches = value.match(/\d{6,}/g);
  return matches || [];
};

const collectAttachmentTargetIds = (attachments = []) => {
  const ids = [];

  const visitAttachment = (attachment) => {
    if (!attachment) return;

    if (attachment.target?.id) ids.push(attachment.target.id);
    if (attachment.media?.id) ids.push(attachment.media.id);

    ids.push(...extractNumericIdsFromText(attachment.url));
    ids.push(...extractNumericIdsFromText(attachment.unshimmed_url));

    const nested = attachment.subattachments?.data || attachment.attachments?.data || [];
    nested.forEach(visitAttachment);
  };

  attachments.forEach(visitAttachment);
  return ids;
};

const extractReelOrVideoIds = (post) => {
  const attachmentTargetIds = collectAttachmentTargetIds(post.attachments?.data || []);
  const reelMatch = post.permalink_url?.match(/\/reel\/(\d+)/);
  const videoMatch = post.permalink_url?.match(/\/videos\/(\d+)/);
  const postTailId = post.id?.includes('_') ? post.id.split('_').pop() : null;

  return uniqueValues([
    reelMatch?.[1],
    videoMatch?.[1],
    ...attachmentTargetIds,
    ...extractNumericIdsFromText(post.permalink_url),
    ...extractNumericIdsFromText(post.link),
    postTailId,
    post.id,
  ]);
};

const readJson = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GRAPH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
};

const isRetryableFacebookError = (error) => {
  if (!error) return false;

  if (error.name === 'AbortError') return true;

  const code = Number(error.code);
  const subcode = Number(error.error_subcode);

  return (
    code === 20 ||
    code === 1 ||
    code === 2 ||
    code === 4 ||
    code === 17 ||
    code === 341 ||
    subcode === 99
  );
};

const fetchFacebookJsonWithRetry = async (url, { label, retries = 2 } = {}) => {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const data = await readJson(url);

      if (data?.error) {
        const error = new Error(data.error.message || 'Facebook Graph API error');
        error.code = data.error.code;
        error.error_subcode = data.error.error_subcode;
        error.type = data.error.type;
        throw error;
      }

      return data;
    } catch (error) {
      lastError = error;
      const isTimeout = error.name === 'AbortError' || Number(error.code) === 20;

      if (!isRetryableFacebookError(error) || attempt === retries) {
        break;
      }

      const backoffMs = 800 * (attempt + 1);
      console.warn(`[Facebook Graph API] ${label || 'request'} failed, retrying in ${backoffMs}ms`, {
        message: isTimeout ? `Request timed out after ${GRAPH_TIMEOUT_MS}ms` : error.message,
        code: isTimeout ? 'TIMEOUT' : error.code,
        error_subcode: error.error_subcode,
      });
      await sleep(backoffMs);
    }
  }

  throw lastError;
};

const extractVideoInsightViews = (items = []) => {
  const metric = items.find((item) =>
    ['total_video_views', 'total_video_views_unique'].includes(item.name)
  );

  return metric?.values?.[0]?.value || null;
};

const fetchVideoViewsForId = async (objectId, accessToken) => {
  const cachedViews = getCachedVideoViews(objectId);
  if (cachedViews !== undefined) {
    return cachedViews;
  }

  const detailUrl = `https://graph.facebook.com/v20.0/${objectId}?fields=views&access_token=${accessToken}`;
  const detailData = await fetchFacebookJsonWithRetry(detailUrl, { label: 'video.detail', retries: 1 }).catch(() => null);

  if (detailData && typeof detailData.views === 'number') {
    setCachedVideoViews(objectId, detailData.views);
    return detailData.views;
  }

  const videoInsightsUrl = `https://graph.facebook.com/v20.0/${objectId}/video_insights?metric=total_video_views,total_video_views_unique&access_token=${accessToken}`;
  const videoInsightsData = await fetchFacebookJsonWithRetry(videoInsightsUrl, { label: 'video.video_insights', retries: 1 }).catch(() => null);

  if (videoInsightsData && Array.isArray(videoInsightsData.data)) {
    const views = extractVideoInsightViews(videoInsightsData.data);
    if (typeof views === 'number' && views > 0) {
      setCachedVideoViews(objectId, views);
      return views;
    }
  }

  const insightsUrl = `https://graph.facebook.com/v20.0/${objectId}/insights?metric=total_video_views,total_video_views_unique&access_token=${accessToken}`;
  const insightsData = await fetchFacebookJsonWithRetry(insightsUrl, { label: 'video.insights', retries: 1 }).catch(() => null);

  if (!insightsData || !Array.isArray(insightsData.data)) {
    setCachedVideoViews(objectId, null);
    return null;
  }

  const insightsViews = extractVideoInsightViews(insightsData.data);
  setCachedVideoViews(objectId, insightsViews);
  return insightsViews;
};

const fetchVideoViews = async (objectIds, accessToken) => {
  const candidates = Array.isArray(objectIds) ? objectIds : [objectIds];
  let highestViews = null;

  for (const objectId of candidates) {
    if (!objectId) continue;

    const views = await fetchVideoViewsForId(objectId, accessToken);
    if (typeof views === 'number' && views > 0) {
      highestViews = Math.max(highestViews || 0, views);
    }
  }

  return highestViews;
};

const applyFetchedMetrics = (post, videoViews) => {
  let nextPost = { ...post };

  if (typeof videoViews === 'number' && videoViews > 0) {
    nextPost.views = videoViews;
    nextPost.viewsSource = 'video_views';
  }

  return nextPost;
};

const mapStoredPostToApiPost = (post) => {
  const likes = post.likeCount || 0;
  const comments = post.commentCount || 0;
  const shares = post.shareCount || 0;

  return {
    id: post.facebookPostId,
    message: post.message || '[Chỉ chứa Hình ảnh/Video]',
    created_time: post.publishedAt,
    permalink_url: post.permalinkUrl,
    full_picture: Array.isArray(post.mediaUrls) ? post.mediaUrls[0] || null : null,
    likes,
    comments,
    shares,
    views: null,
    viewsSource: 'unavailable',
    impressions: null,
    reach: null,
    engagedUsers: null,
    engagements: likes + comments + shares,
  };
};

const loadStoredPostsFallback = async (pageId, sort) => {
  const storedPosts = await FacebookPost.listByPage(pageId, { limit: 100, offset: 0 });
  let posts = storedPosts.map(mapStoredPostToApiPost);

  if (sort === 'likes') {
    posts.sort((a, b) => b.likes - a.likes);
  } else if (sort === 'comments') {
    posts.sort((a, b) => b.comments - a.comments);
  } else if (sort === 'views') {
    posts.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (sort === 'engagements') {
    posts.sort((a, b) => b.engagements - a.engagements);
  } else {
    posts.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
  }

  return posts;
};

module.exports = {
  async listPages(user) {
    // Trả về danh sách trang đã kết nối từ DB
    const pages = await FacebookPage.listAll();
    return pages.length > 0 ? pages : [
      { id: 'mock1', pageId: 'page1', pageName: 'Mock Page (Chưa kết nối)', status: 'disconnected' }
    ];
  },

  async connectPage(data) {
    const { code, redirectUri } = data;
    if (!code) {
      throw new Error("Missing OAuth code");
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      console.warn("FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET chưa được cấu hình. Sử dụng mock data.");
      // MOCK: Lưu trang demo vào database nếu chưa cấu hình App ID
      const pageId = `page_${Date.now()}`;
      
      // Kiểm tra xem đã có page nào chưa để tránh duplicate key
      const existing = await FacebookPage.getByPageId(pageId);
      if (existing) {
        return { success: true, pages: [existing] };
      }
      
      const mockPage = await FacebookPage.createPage({
        pageId,
        pageName: 'Demo Connected Page',
        avatarUrl: 'https://graph.facebook.com/v20.0/mock/picture',
        accessToken: 'mock_token',
        tokenExpiresAt: new Date(Date.now() + 365*24*60*60*1000), // 1 năm
        connectedByUserId: 1,
        status: 'connected'
      });
      return { success: true, pages: [mockPage] };
    }

    try {
      // 1. Exchange code for User Access Token
      const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        throw new Error(tokenData.error.message);
      }

      const userAccessToken = tokenData.access_token;

      // Exchange short-lived User Access Token for a long-lived User Access Token
      const longLivedTokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`;
      const longLivedRes = await fetch(longLivedTokenUrl);
      const longLivedData = await longLivedRes.json();

      let finalUserToken = userAccessToken;
      let tokenExpiresIn = 60 * 24 * 60 * 60 * 1000; // default 60 days

      if (longLivedData.access_token) {
        finalUserToken = longLivedData.access_token;
        if (longLivedData.expires_in) {
          tokenExpiresIn = longLivedData.expires_in * 1000;
        }
      } else {
        console.warn("Could not exchange for long-lived token, using short-lived token:", longLivedData.error);
      }

      // 2. Lấy danh sách Pages mà user quản lý bằng long-lived token
      const accountsUrl = `https://graph.facebook.com/v20.0/me/accounts?access_token=${finalUserToken}`;
      const accountsRes = await fetch(accountsUrl);
      const accountsData = await accountsRes.json();

      if (accountsData.error) {
        throw new Error(accountsData.error.message);
      }

      const savedPages = [];
      // 3. Cập nhật danh sách Page vào DB
      for (const page of accountsData.data) {
        const existing = await FacebookPage.getByPageId(page.id);
        const avatarUrl = `https://graph.facebook.com/v20.0/${page.id}/picture?type=normal`;
        if (existing) {
          // Cập nhật status và access token mới
          await FacebookPage.updateConnection(existing.id, {
            accessToken: page.access_token,
            tokenExpiresAt: new Date(Date.now() + tokenExpiresIn),
            status: 'connected',
            pageName: page.name,
            avatarUrl
          });
          const updated = await FacebookPage.getByPageId(page.id);
          savedPages.push(updated);
        } else {
          const newPage = await FacebookPage.createPage({
            pageId: page.id,
            pageName: page.name,
            avatarUrl,
            accessToken: page.access_token,
            tokenExpiresAt: new Date(Date.now() + tokenExpiresIn),
            connectedByUserId: 1, // mặc định user 1
            status: 'connected'
          });
          savedPages.push(newPage);
        }
      }

      return { success: true, pages: savedPages };
    } catch (error) {
      console.error("Facebook OAuth Error:", error);
      throw new Error("Lấy dữ liệu từ Facebook thất bại: " + error.message);
    }
  },

  async disconnectPage(pageId) {
    const page = await FacebookPage.getByPageId(pageId);
    if (page) {
      await FacebookPage.updateStatus(page.id, 'disconnected');
    }
    return { success: true, pageId };
  },

  async syncPage(pageId) {
    const page = await FacebookPage.getByPageId(pageId);
    if (!page || !page.accessToken) {
      throw new Error("Page chưa được kết nối hoặc không có Access Token.");
    }
    
    // Gọi API lấy bài viết và đồng bộ vào DB
    try {
      const posts = await this.listPosts(pageId);
      for (const p of posts) {
        await FacebookPost.upsertPost({
          pageId,
          facebookPostId: p.id,
          message: p.message,
          mediaType: p.full_picture ? 'photo' : 'text',
          mediaUrls: p.full_picture ? [p.full_picture] : [],
          permalinkUrl: p.permalink_url,
          likeCount: p.likes || 0,
          commentCount: p.comments || 0,
          shareCount: p.shares || 0,
          publishedAt: p.created_time
        });
      }
      return { success: true, pageId, syncedPosts: posts.length };
    } catch (error) {
      console.error("Lỗi khi sync page:", error);
      throw error;
    }
  },

  async getPageDetails(pageId) {
    const page = await FacebookPage.getByPageId(pageId);
    if (!page) {
      throw new Error("Page chưa được kết nối.");
    }
    
    if (!page.accessToken || page.accessToken === 'mock_token') {
      // Mock page details
      return {
        id: page.pageId,
        name: page.pageName,
        picture: page.avatarUrl || 'https://via.placeholder.com/150',
        followers_count: 12500,
        fan_count: 10400,
        about: 'Trang đào tạo Trading tài chính 3HSTATION',
        category: 'Education',
        link: 'https://facebook.com/3hstation'
      };
    }

    try {
      const url = `https://graph.facebook.com/v20.0/${pageId}?fields=id,name,picture{url},followers_count,fan_count,about,category,link&access_token=${page.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) throw new Error(data.error.message);

      return {
        id: data.id,
        name: data.name,
        picture: data.picture?.data?.url || '',
        followers_count: data.followers_count || 0,
        fan_count: data.fan_count || 0,
        about: data.about || '',
        category: data.category || '',
        link: data.link || `https://facebook.com/${data.id}`
      };
    } catch (error) {
      console.error("Lỗi khi lấy thông tin Page:", error);
      throw new Error("Không thể tải thông tin Page từ Facebook.");
    }
  },

  async listPosts(pageId, query) {
    const page = await FacebookPage.getByPageId(pageId);
    
    if (!page) {
      throw new Error("Page chưa được kết nối.");
    }

    if (!page.accessToken || page.accessToken === 'mock_token') {
      // Mock posts data
      return [
        {
          id: `${pageId}_post1`,
          message: 'Chào mừng các bạn đến với khóa học Trading thực chiến Basic!',
          created_time: '2026-06-22T10:00:00.000Z',
          permalink_url: 'https://facebook.com/3hstation/posts/1',
          likes: 120,
          comments: 45,
          views: 950,
          engagements: 165
        },
        {
          id: `${pageId}_post2`,
          message: 'Lộ trình từ Newbie trở thành Trader chuyên nghiệp năm 2026.',
          created_time: '2026-06-21T15:30:00.000Z',
          permalink_url: 'https://facebook.com/3hstation/posts/2',
          likes: 230,
          comments: 80,
          views: 1800,
          engagements: 310
        }
      ];
    }

    try {
      const { since, until, sort, limit, fetchAll, includeViews } = query || {};
      const requestedLimit = Math.min(
        parsePositiveInt(limit, DEFAULT_POST_LIMIT),
        MAX_POST_LIMIT
      );
      const shouldFetchAll = parseBoolean(fetchAll) || Boolean(since || until);
      const effectiveLimit = shouldFetchAll ? MAX_POST_LIMIT : requestedLimit;
      const initialPageLimit = Math.min(
        effectiveLimit,
        MAX_GRAPH_PAGE_LIMIT,
        DEFAULT_GRAPH_PAGE_LIMIT
      );
      const shouldResolveViews = sort === 'views' || parseBoolean(includeViews);
      let timeFilter = '';
      if (since) timeFilter += `&since=${since}`;
      if (until) timeFilter += `&until=${until}`;

      const attachmentFields = `attachments{target,media_type,type,url,unshimmed_url,media,subattachments{target,media_type,type,url,unshimmed_url,media}}`;
      const primaryFields = shouldResolveViews
        ? `id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares,${attachmentFields}`
        : `id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares`;
      const fallbackFields = shouldResolveViews
        ? `id,message,created_time,permalink_url,full_picture,shares,${attachmentFields}`
        : `id,message,created_time,permalink_url,full_picture,shares`;

      let allData = [];
      let fetchCount = 0;
      let remaining = effectiveLimit;
      let url = `https://graph.facebook.com/v20.0/${pageId}/posts?fields=${primaryFields}&access_token=${page.accessToken}&limit=${initialPageLimit}${timeFilter}`;
      let usingFallbackFields = false;

      while (url && fetchCount < MAX_POST_PAGING_REQUESTS && remaining > 0) {
        try {
          const data = await fetchFacebookJsonWithRetry(url, { label: '/posts' });
          const pageItems = (data.data || []).slice(0, remaining);
          allData = allData.concat(pageItems);
          remaining -= pageItems.length;
          url = data.paging?.next && remaining > 0 ? data.paging.next : null;
          fetchCount++;
        } catch (error) {
          console.error("[Facebook Posts API] /posts error:", {
            code: error.code,
            message: error.message,
            error_subcode: error.error_subcode,
          });

          if (!usingFallbackFields) {
            usingFallbackFields = true;
            allData = [];
            fetchCount = 0;
            remaining = effectiveLimit;
            url = `https://graph.facebook.com/v20.0/${pageId}/posts?fields=${fallbackFields}&access_token=${page.accessToken}&limit=${initialPageLimit}${timeFilter}`;
            console.warn('[Facebook Posts API] Falling back to reduced post fields after primary query failed.');
            continue;
          }

          const cachedPosts = await loadStoredPostsFallback(pageId, sort);
          if (cachedPosts.length > 0) {
            console.warn('[Facebook Posts API] Returning cached posts from database because live Graph API failed.');
            return cachedPosts;
          }

          throw error;
        }
      }

      let posts = allData.map(post => {
        const likesCount = post.likes?.summary?.total_count || 0;
        const commentsCount = post.comments?.summary?.total_count || 0;
        const sharesCount = post.shares?.count || 0;
        const engagements = likesCount + commentsCount + sharesCount;

        return {
          id: post.id,
          message: post.message || '[Chỉ chứa Hình ảnh/Video]',
          created_time: post.created_time,
          permalink_url: post.permalink_url,
          full_picture: post.full_picture || null,
          likes: likesCount,
          comments: commentsCount,
          shares: sharesCount,
          mediaObjectIds: shouldResolveViews ? extractReelOrVideoIds(post) : [],
          views: null,
          viewsSource: 'unavailable',
          impressions: null,
          reach: null,
          engagedUsers: null,
          engagements
        };
      });

      if (shouldResolveViews && posts.length > 0) {
        for (const group of chunk(posts, 5)) {
          const resolved = await Promise.all(
            group.map(async (post) => {
              const videoViews = await fetchVideoViews(post.mediaObjectIds, page.accessToken);
              return applyFetchedMetrics(post, videoViews);
            })
          );

          const resolvedMap = new Map(resolved.map((post) => [post.id, post]));
          posts = posts.map((post) => resolvedMap.get(post.id) || post);
        }
      }

      posts = posts.map(({ mediaObjectIds, ...post }) => post);

      if (sort === 'likes') {
        posts.sort((a, b) => b.likes - a.likes);
      } else if (sort === 'comments') {
        posts.sort((a, b) => b.comments - a.comments);
      } else if (sort === 'views') {
        posts.sort((a, b) => (b.views || 0) - (a.views || 0));
      } else if (sort === 'engagements') {
        posts.sort((a, b) => b.engagements - a.engagements);
      } else {
        posts.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
      }

      return posts;
    } catch (error) {
      console.error("Lỗi khi lấy bài viết thật:", error);
      throw new Error("Không thể tải bài viết từ Facebook.");
    }
  },

  async sendFacebookMessage(pageId, recipientId, text) {
    const page = await FacebookPage.getByPageId(pageId);
    if (!page) {
      throw new Error(`Page ID ${pageId} không tồn tại hoặc chưa kết nối.`);
    }

    if (!page.accessToken || page.accessToken === 'mock_token') {
      console.log(`[Facebook Mock Send] Page ${page.pageName} (ID: ${pageId}) -> Gửi tin nhắn đến Khách ${recipientId}: "${text}"`);
      return { recipient_id: recipientId, message_id: `mock_mid_${Date.now()}` };
    }

    try {
      const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${page.accessToken}`;
      console.log(`[Facebook Send API] Page ${pageId} -> Khách ${recipientId}: "${text}"`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text }
        })
      });

      const result = await response.json();
      if (result.error) {
        console.error('[Facebook Send API Error]', result.error);
        throw new Error(result.error.message);
      }

      return result;
    } catch (error) {
      console.error('[Facebook] Gửi tin nhắn qua API thất bại:', error);
      throw error;
    }
  },

  async listConversations(pageId) {
    const page = await FacebookPage.getByPageId(pageId);
    if (!page) {
      throw new Error("Page chưa được kết nối.");
    }

    if (!page.accessToken || page.accessToken === 'mock_token') {
      // Mock data cho trường hợp chưa cấu hình token thật
      return [
        {
          id: 't_mock_conv_1',
          updated_time: new Date().toISOString(),
          customer_id: 'customer_test_789',
          customer_name: 'Nhất Thiên',
          last_message: 'Học phí khóa Trading tài chính bao nhiêu em?'
        },
        {
          id: 't_mock_conv_2',
          updated_time: new Date(Date.now() - 3600*1000).toISOString(),
          customer_id: 'customer_test_999',
          customer_name: 'Nguyễn Văn A',
          last_message: 'SĐT của mình là 0900000000'
        }
      ];
    }

    try {
      const url = `https://graph.facebook.com/v20.0/${pageId}/conversations?fields=id,updated_time,senders,messages.limit(1){message,id,from,created_time}&access_token=${page.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error.message);

      const conversations = [];
      for (const conv of (data.data || [])) {
        const senders = conv.senders?.data || [];
        const customer = senders.find(s => s.id !== pageId) || senders[0] || { id: 'unknown', name: 'Khách hàng' };
        
        const lastMsgObj = conv.messages?.data?.[0];
        const lastMessage = lastMsgObj ? lastMsgObj.message : '';

        // Tự động tạo hoặc lấy Lead từ DB
        let lead = await FacebookLead.getByPageAndUser(pageId, customer.id);
        if (!lead) {
          lead = await FacebookLead.createLead({
            pageId,
            facebookUserId: customer.id,
            leadStatus: 'new_lead',
            aiEnabled: 1,
            notes: `FB Name: ${customer.name}`
          });
        }

        // Tự động nhận dạng số điện thoại từ tin nhắn cuối nếu lead chưa có số điện thoại
        if (!lead.phone && lastMessage) {
          const cleanStr = lastMessage.replace(/[\s.\-_()]/g, '');
          const phoneRegex = /(?:\+84|84|0)(3|5|7|8|9)[0-9]{8}\b/;
          const phoneMatch = cleanStr.match(phoneRegex);
          if (phoneMatch) {
            const matchedNumber = phoneMatch[0];
            let normalized = matchedNumber;
            if (matchedNumber.startsWith('+84')) {
              normalized = '0' + matchedNumber.slice(3);
            } else if (matchedNumber.startsWith('84')) {
              normalized = '0' + matchedNumber.slice(2);
            }
            lead = await FacebookLead.updateLead(lead.id, {
              phone: normalized,
              leadStatus: lead.leadStatus === 'new_lead' ? 'asked_phone' : lead.leadStatus
            });
          }
        }

        conversations.push({
          id: conv.id, // Conversation Thread ID
          pageId,
          updated_time: conv.updated_time,
          customer_id: customer.id,
          customer_name: customer.name,
          last_message: lastMessage,
          lead_id: lead.id,
          lead_status: lead.leadStatus,
          ai_enabled: lead.aiEnabled,
          phone: lead.phone,
          notes: lead.notes,
          course_interest: lead.courseInterest,
          customer_avatar: `https://graph.facebook.com/v20.0/${customer.id}/picture?type=normal`,
          profile_link: `https://facebook.com/${customer.id}`,
          tags: lead.tags,
          sale_agent: lead.saleAgent
        });
      }

      return conversations;
    } catch (error) {
      console.error("Lỗi khi lấy hội thoại từ FB:", error);
      throw error;
    }
  },

  async listMessages(pageId, conversationId) {
    const page = await FacebookPage.getByPageId(pageId);
    if (!page) {
      throw new Error("Page chưa được kết nối.");
    }

    if (!page.accessToken || page.accessToken === 'mock_token') {
      if (conversationId === 't_mock_conv_1') {
        return [
          {
            id: 'm_1',
            message: 'Chào shop!',
            from_id: 'customer_test_789',
            from_name: 'Nhất Thiên',
            created_time: new Date(Date.now() - 600*1000).toISOString()
          },
          {
            id: 'm_2',
            message: 'Học phí khóa Trading tài chính bao nhiêu em?',
            from_id: 'customer_test_789',
            from_name: 'Nhất Thiên',
            created_time: new Date(Date.now() - 300*1000).toISOString()
          },
          {
            id: 'm_3',
            message: 'Dạ, hệ thống 3HSTATION ghi nhận câu hỏi của anh/chị. Khóa Trading Basic của chúng tôi đang có giá ưu đãi là 2.500.000đ. Anh/chị đã từng giao dịch chưa hay mới bắt đầu ạ?',
            from_id: pageId,
            from_name: page.pageName,
            created_time: new Date(Date.now() - 290*1000).toISOString()
          }
        ];
      }
      return [];
    }

    try {
      const url = `https://graph.facebook.com/v20.0/${conversationId}/messages?fields=id,message,from,to,created_time&limit=100&access_token=${page.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error.message);

      const messages = (data.data || []).map(msg => ({
        id: msg.id,
        message: msg.message,
        from_id: msg.from?.id,
        from_name: msg.from?.name,
        created_time: msg.created_time
      })).reverse();

      return messages;
    } catch (error) {
      console.error("Lỗi khi lấy tin nhắn từ FB:", error);
      throw error;
    }
  },

  async likePost(postId, data) {
    return { success: true, postId, liked: true };
  },

  async unlikePost(postId, data) {
    return { success: true, postId, liked: false };
  },

  async listComments(postId, query) {
    return [{ id: 'comment1', message: 'Hay quá!', postId }];
  },

  async replyComment(commentId, data) {
    return { success: true, commentId, reply: data.message || '' };
  },

  async likeComment(commentId, data) {
    return { success: true, commentId, liked: true };
  },

  async hideComment(commentId, data) {
    return { success: true, commentId, hidden: data.hidden || false };
  },

  async markCommentResolved(commentId) {
    return { success: true, commentId, resolved: true };
  }
};
