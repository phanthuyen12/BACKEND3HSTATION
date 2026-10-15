const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const rankService = require('../services/rankService');

const listRanks = asyncHandler(async (req, res) => {
  const data = await rankService.listRanks({
    search: req.query.search,
    status: req.query.status,
    page: req.query.page,
    limit: req.query.limit
  });
  return successResponse(res, data);
});

const getRankById = asyncHandler(async (req, res) => {
  const data = await rankService.getRankById(req.params.id);
  return successResponse(res, { data });
});

const createRank = asyncHandler(async (req, res) => {
  const data = await rankService.createRank(req.body);
  return successResponse(res, { data }, 'Rank created', 201);
});

const updateRank = asyncHandler(async (req, res) => {
  const data = await rankService.updateRank(req.params.id, req.body);
  return successResponse(res, { data }, 'Rank updated');
});

const deleteRank = asyncHandler(async (req, res) => {
  await rankService.deleteRank(req.params.id);
  return successResponse(res, {}, 'Rank deleted');
});

const setRankCourses = asyncHandler(async (req, res) => {
  const data = await rankService.setRankCourses(req.params.id, req.body.courseIds || []);
  return successResponse(res, { data }, 'Rank courses updated');
});

const addRankCourse = asyncHandler(async (req, res) => {
  const data = await rankService.addRankCourse(req.params.id, req.body.courseId, req.body.status);
  return successResponse(res, { data }, 'Course assigned to rank');
});

const removeRankCourse = asyncHandler(async (req, res) => {
  await rankService.removeRankCourse(req.params.id, req.params.courseId);
  return successResponse(res, {}, 'Course removed from rank');
});

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
