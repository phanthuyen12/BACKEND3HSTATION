const courseSectionService = require('../services/courseSectionService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const getSectionsByCourse = asyncHandler(async (req, res) => {
  const data = await courseSectionService.getSectionsByCourseId(req.params.course_id);
  return successResponse(res, data);
});

const getSectionById = asyncHandler(async (req, res) => {
  const data = await courseSectionService.getSectionById(req.params.id);
  return successResponse(res, data);
});

const createSection = asyncHandler(async (req, res) => {
  const section = await courseSectionService.createSection({
    courseId: req.params.course_id,
    title: req.body.title,
    order: req.body.order
  });
  return successResponse(res, section, 'Section created', 201);
});

const updateSection = asyncHandler(async (req, res) => {
  const section = await courseSectionService.updateSection(req.params.id, {
    title: req.body.title,
    order: req.body.order
  });
  return successResponse(res, section, 'Section updated');
});

const deleteSection = asyncHandler(async (req, res) => {
  await courseSectionService.deleteSection(req.params.id);
  return successResponse(res, {}, 'Section deleted');
});

module.exports = {
  getSectionsByCourse,
  getSectionById,
  createSection,
  updateSection,
  deleteSection
};







