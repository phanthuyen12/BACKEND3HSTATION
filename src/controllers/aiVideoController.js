const aiVideoService = require('../services/aiVideoService');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const processBatchVideos = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No video files uploaded'
    });
  }

  console.log(`Received ${req.files.length} videos for processing.`);

  // Process videos in parallel or sequence. 
  // Parallel might hit rate limits, so sequence is safer for Gemini free tier.
  const results = [];
  for (const file of req.files) {
    const result = await aiVideoService.processVideoFile(file);
    results.push(result);
  }

  return successResponse(res, results, 'Batch processing completed');
});

module.exports = {
  processBatchVideos
};
