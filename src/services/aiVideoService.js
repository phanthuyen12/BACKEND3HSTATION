const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

/**
 * Uploads a video file to Google AI File Manager and waits for it to be processed.
 * @param {string} filePath Path to the local video file.
 * @param {string} displayName Display name for the file.
 * @returns {Promise<Object>} The uploaded file object.
 */
const uploadAndProcessVideo = async (filePath, displayName) => {
  console.log(`Uploading ${displayName} to Gemini...`);
  
  const uploadResponse = await fileManager.uploadFile(filePath, {
    mimeType: "video/mp4", // Assuming mp4, should be dynamic if possible
    displayName: displayName,
  });

  const name = uploadResponse.file.name;

  // Poll for processing status
  let file = await fileManager.getFile(name);
  while (file.state === "PROCESSING") {
    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    file = await fileManager.getFile(name);
  }

  if (file.state === "FAILED") {
    throw new Error("Video processing failed.");
  }

  console.log(`\nFile ${file.displayName} is ready for processing.`);
  return file;
};

/**
 * Analyzes the video content using Gemini.
 * @param {string} fileUri The URI of the uploaded video in Gemini.
 * @param {string} fileMimeType The mime type of the video.
 * @returns {Promise<string>} The extracted content (transcription/summary).
 */
const analyzeVideoContent = async (fileUri, fileMimeType) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    {
      fileData: {
        mimeType: fileMimeType,
        fileUri: fileUri
      }
    },
    { text: "Hãy đọc nội dung video này và tóm tắt chi tiết các ý chính. Nếu có hội thoại, hãy cung cấp bản gỡ băng (transcription) ngắn gọn." },
  ]);

  return result.response.text();
};

/**
 * Process a single video file.
 * @param {Object} file Multer file object.
 * @returns {Promise<Object>} The result containing filename and analysis.
 */
const processVideoFile = async (file) => {
  const filePath = file.path;
  const displayName = file.originalname;

  try {
    const uploadedFile = await uploadAndProcessVideo(filePath, displayName);
    const analysis = await analyzeVideoContent(uploadedFile.uri, uploadedFile.mimeType);
    
    // Cleanup: remove local file after processing
    fs.unlinkSync(filePath);
    
    return {
      fileName: displayName,
      status: 'success',
      content: analysis
    };
  } catch (error) {
    console.error(`Error processing video ${displayName}:`, error);
    // Cleanup on error too
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return {
      fileName: displayName,
      status: 'error',
      error: error.message
    };
  }
};

module.exports = {
  processVideoFile
};
