const ApiError = require('../utils/apiError');
const rankModel = require('../models/rankModel');
const rankCourseModel = require('../models/rankCourseModel');
const courseModel = require('../models/courseModel');
const { buildPagination } = require('../utils/pagination');

const listRanks = async ({ search, status, page, limit }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  const [items, total] = await Promise.all([
    rankModel.listRanks({ search, status, limit: take, offset }),
    rankModel.countRanks({ search, status })
  ]);

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

const getRankById = async (id) => {
  const rank = await rankModel.getRankById(parseInt(id, 10));
  if (!rank) {
    throw ApiError.notFound('Rank not found');
  }
  const courses = await rankCourseModel.listRankCourses(rank.id);
  return { ...rank, courses };
};

const createRank = async (payload) => {
  const existing = await rankModel.getRankByCode(payload.code);
  if (existing) {
    throw ApiError.badRequest('Rank code already exists');
  }
  return rankModel.createRank(payload);
};

const updateRank = async (id, payload) => {
  const rank = await rankModel.getRankById(parseInt(id, 10));
  if (!rank) {
    throw ApiError.notFound('Rank not found');
  }

  if (payload.code && payload.code !== rank.code) {
    const duplicate = await rankModel.getRankByCode(payload.code);
    if (duplicate) {
      throw ApiError.badRequest('Rank code already exists');
    }
  }

  return rankModel.updateRank(parseInt(id, 10), payload);
};

const deleteRank = async (id) => {
  const rank = await rankModel.getRankById(parseInt(id, 10));
  if (!rank) {
    throw ApiError.notFound('Rank not found');
  }
  await rankModel.deleteRank(parseInt(id, 10));
};

const setRankCourses = async (rankId, courseIds = []) => {
  const rank = await rankModel.getRankById(parseInt(rankId, 10));
  if (!rank) {
    throw ApiError.notFound('Rank not found');
  }

  const normalizedCourseIds = [...new Set(courseIds.map((id) => parseInt(id, 10)).filter(Boolean))];
  for (const courseId of normalizedCourseIds) {
    const course = await courseModel.getCourseById(courseId);
    if (!course) {
      throw ApiError.notFound(`Course not found: ${courseId}`);
    }
  }

  return rankCourseModel.syncRankCourses({ rankId: parseInt(rankId, 10), courseIds: normalizedCourseIds });
};

const addRankCourse = async (rankId, courseId, status = 'active') => {
  const rank = await rankModel.getRankById(parseInt(rankId, 10));
  if (!rank) {
    throw ApiError.notFound('Rank not found');
  }

  const course = await courseModel.getCourseById(parseInt(courseId, 10));
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  return rankCourseModel.assignCourse({
    rankId: parseInt(rankId, 10),
    courseId: parseInt(courseId, 10),
    status
  });
};

const removeRankCourse = async (rankId, courseId) => {
  const rank = await rankModel.getRankById(parseInt(rankId, 10));
  if (!rank) {
    throw ApiError.notFound('Rank not found');
  }

  await rankCourseModel.removeCourse({
    rankId: parseInt(rankId, 10),
    courseId: parseInt(courseId, 10)
  });
};

module.exports = {
  listRanks,
  getRankById,
  createRank,
  updateRank,
  deleteRank,
  setRankCourses,
  addRankCourse,
  removeRankCourse
};
