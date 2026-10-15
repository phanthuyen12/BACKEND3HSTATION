const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const configModel = require('../models/configModel');
const supportModel = require('../models/supportModel');
const mail = require('../utils/mail');
const { buildPagination } = require('../utils/pagination');
const ApiError = require('../utils/apiError');
const {
  supportEmail,
  faqItems,
  policySections,
  supportHighlights
} = require('../constants/supportContent');

const getSupportContent = asyncHandler(async (_req, res) => {
  const configs = await configModel.getAllConfigs().catch(() => ({}));

  return successResponse(res, {
    supportEmail,
    supportPhone: configs.support_phone || 'Đang cập nhật từ cấu hình hệ thống',
    domainName: configs.domain_name || '3HSTATION',
    faqItems,
    policySections,
    supportHighlights
  });
});

const createContactRequest = asyncHandler(async (req, res) => {
  const payload = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    topic: req.body.topic,
    message: req.body.message,
    sourcePage: req.body.sourcePage,
    refCode: req.body.refCode,
    redirectUrl: req.body.redirectUrl
  };

  const created = await supportModel.createSupportRequest(payload);

  const subject = `[3HSTATION Support] ${payload.topic}`;
  const text = [
    'Yeu cau ho tro moi tu frontend',
    `Ho ten: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.phone ? `Dien thoai: ${payload.phone}` : null,
    `Chu de: ${payload.topic}`,
    `Nguon: ${payload.sourcePage || 'landing-contact'}`,
    payload.refCode ? `Ref: ${payload.refCode}` : null,
    payload.redirectUrl ? `Link dich: ${payload.redirectUrl}` : null,
    '',
    payload.message
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #1f2937;">
      <h2 style="margin-bottom: 12px;">Yeu cau ho tro moi</h2>
      <p><strong>Ho ten:</strong> ${payload.name}</p>
      <p><strong>Email:</strong> ${payload.email}</p>
      ${payload.phone ? `<p><strong>Dien thoai:</strong> ${payload.phone}</p>` : ''}
      <p><strong>Chu de:</strong> ${payload.topic}</p>
      <p><strong>Nguon:</strong> ${payload.sourcePage || 'landing-contact'}</p>
      ${payload.refCode ? `<p><strong>Ref:</strong> ${payload.refCode}</p>` : ''}
      ${payload.redirectUrl ? `<p><strong>Link dich:</strong> ${payload.redirectUrl}</p>` : ''}
      <p><strong>Noi dung:</strong></p>
      <div style="white-space: pre-wrap; padding: 12px; background: #f8fafc; border-radius: 8px;">${payload.message}</div>
    </div>
  `;

  await mail.sendMail(supportEmail, subject, text, html);

  return successResponse(
    res,
    {
      id: created?.id || null,
      status: created?.status || 'new'
    },
    'Đã tiếp nhận yêu cầu hỗ trợ',
    201
  );
});

const listSupportRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search, sourcePage } = req.query;
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);

  const items = await supportModel.listSupportRequests({
    status,
    search,
    sourcePage,
    limit: take,
    offset
  });

  const total = await supportModel.countSupportRequests({
    status,
    search,
    sourcePage
  });

  return successResponse(res, {
    data: items,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  });
});

const getSupportRequestById = asyncHandler(async (req, res) => {
  const item = await supportModel.getSupportRequestById(req.params.id);

  if (!item) {
    throw ApiError.notFound('Support request not found');
  }

  return successResponse(res, item);
});

const updateSupportRequestStatus = asyncHandler(async (req, res) => {
  const existing = await supportModel.getSupportRequestById(req.params.id);

  if (!existing) {
    throw ApiError.notFound('Support request not found');
  }

  const updated = await supportModel.updateSupportRequestStatus(req.params.id, req.body.status);
  return successResponse(res, updated, 'Cập nhật trạng thái yêu cầu hỗ trợ thành công');
});

const getSupportRequestStats = asyncHandler(async (_req, res) => {
  const stats = await supportModel.getSupportRequestStats();

  return successResponse(res, {
    total: Number(stats.total || 0),
    totalNew: Number(stats.total_new || 0),
    totalReviewing: Number(stats.total_reviewing || 0),
    totalResolved: Number(stats.total_resolved || 0)
  });
});

module.exports = {
  getSupportContent,
  createContactRequest,
  listSupportRequests,
  getSupportRequestById,
  updateSupportRequestStatus,
  getSupportRequestStats
};
