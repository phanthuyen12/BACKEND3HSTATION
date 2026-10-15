const ApiError = require('../../utils/apiError');
const courseModel = require('../../models/elearning/courseModel');
const categoryModel = require('../../models/categoryModel');
const userCourseModel = require('../../models/userCourseModel');
const rankCourseModel = require('../../models/rankCourseModel');
const rankModel = require('../../models/rankModel');
const userModel = require('../../models/userModel');
const courseSectionModel = require('../../models/courseSectionModel');
const courseLessonModel = require('../../models/courseLessonModel');
const courseProgressModel = require('../../models/courseProgressModel');
const videoModel = require('../../models/videoModel');
const userCourseService = require('../userCourseService');
const { buildPagination } = require('../../utils/pagination');

const getUserRankId = (user) => {
  if (!user) return null;

  if (user.rank_id !== undefined && user.rank_id !== null) {
    const rankId = parseInt(user.rank_id, 10);
    return Number.isNaN(rankId) ? null : rankId;
  }

  if (user.rank?.id) {
    const rankId = parseInt(user.rank.id, 10);
    return Number.isNaN(rankId) ? null : rankId;
  }

  return null;
};

const resolveCourseAccess = async (course, user) => {
  if (!course || course.status !== 'active') {
    return false;
  }

  if (course.is_free) {
    return true;
  }

  if (!user) {
    return false;
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    return true;
  }

  const rankId = getUserRankId(user);
  if (!rankId) {
    return false;
  }

  return rankCourseModel.isCourseAllowedForRank({
    rankId,
    courseId: course.id
  });
};

const getUserRankIds = async (user) => {
  if (!user || user.role === 'admin' || user.role === 'super_admin') {
    return [];
  }

  const rankId = getUserRankId(user);
  if (!rankId) {
    return [];
  }

  return [rankId];
};

const canAccessCourse = async ({ course, user }) => {
  if (!course) return false;
  if (course.status !== 'active') return false;
  if (course.is_free) return true;
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  const rankId = getUserRankId(user);
  if (!rankId) return false;
  return rankCourseModel.isCourseAllowedForRank({
    rankId,
    courseId: course.id
  });
};

const clampProgressNumber = (value, { min = 0, max = null } = {}) => {
  const numericValue = Number(value || 0);
  if (Number.isNaN(numericValue)) return min;
  const boundedMin = Math.max(min, numericValue);
  return max === null ? boundedMin : Math.min(max, boundedMin);
};

const formatRankSummary = (rank) => (
  rank
    ? {
      id: String(rank.id),
      code: rank.code,
      name: rank.name,
      description: rank.description,
      status: rank.status
    }
    : null
);

const buildCourseProgressPayload = (course, progress = null) => {
  const totalLessons = Number(progress?.total_lessons || 0);
  const completedLessons = Number(progress?.completed_lessons || 0);
  const completionPercent = Number(progress?.completion_percent || 0);

  return {
    id: String(course.id || course.course_id),
    courseId: String(course.id || course.course_id),
    title: course.title,
    thumbnail: course.thumbnail_url || course.thumbnail || '',
    price: String(course.price || 0),
    category: course.category_name || course.category || '',
    progress: completionPercent,
    completionPercent,
    totalLessons,
    completedLessons,
    remainingLessons: Math.max(totalLessons - completedLessons, 0),
    completedAt: progress?.last_completed_at || null,
    lastWatchedAt: progress?.last_watched_at || null,
    updatedAt: progress?.last_progress_at || course.updated_at || course.created_at || null
  };
};

const listCourses = async ({ page, limit, search, category, user = null }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  const categoryId = category ? parseInt(category, 10) : null;

  const [items, total] = await Promise.all([
    courseModel.listCourses({
      status: 'active',
      categoryId,
      search,
      limit: take,
      offset
    }),
    courseModel.countCourses({ status: 'active', categoryId, search })
  ]);

  let allowedCourseIds = new Set();
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    allowedCourseIds = new Set(items.map((course) => Number(course.id)));
  } else {
    const rankId = getUserRankId(user);
    if (rankId) {
      const rankCourseIds = await rankCourseModel.getAllowedCourseIdsByRankIds([rankId]);
      allowedCourseIds = new Set(rankCourseIds);
    }
  }

  const formattedItems = items.map((course) => ({
    id: String(course.id),
    title: course.title,
    shortDescription: course.short_description || '',
    description: course.description || '',
    category: course.category_name || '',
    categoryId: course.category_id ? String(course.category_id) : null,
    thumbnail: course.thumbnail_url || '',
    price: String(course.price || 0),
    level: course.level || 'beginner',
    students: course.students || 0,
    rating: course.rating || 0,
    duration: course.duration || '',
    lessons: course.lessons || 0,
    status: course.status || 'active',
    createdAt: course.created_at,
    updatedAt: course.updated_at,
    can_view_full: course.is_free || allowedCourseIds.has(Number(course.id)) || user?.role === 'admin' || user?.role === 'super_admin',
    is_locked: !(course.is_free || allowedCourseIds.has(Number(course.id)) || user?.role === 'admin' || user?.role === 'super_admin')
  }));

  return {
    data: formattedItems,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getCourseById = async (id, user = null) => {
  const course = await courseModel.getCourseById(parseInt(id, 10));
  if (!course || course.status !== 'active') {
    throw ApiError.notFound('Course not found');
  }

  const hasAccess = await canAccessCourse({ course, user });

  const sections = await courseSectionModel.getSectionsByCourseId(parseInt(id, 10));
  const sectionsWithLessons = await Promise.all(
    sections.map(async (section) => ({
      ...section,
      lessons: await courseLessonModel.getLessonsBySectionId(section.id)
    }))
  );

  return {
    id: String(course.id),
    title: course.title,
    description: course.description || '',
    category: course.category_name || '',
    thumbnail: course.thumbnail_url || '',
    price: String(course.price || 0),
    is_free: course.is_free || false,
    level: course.level || 'beginner',
    students: course.students || 0,
    rating: course.rating || 0,
    duration: course.duration || '',
    lessons: course.lessons || 0,
    content: course.content || '',
    can_view_full: hasAccess,
    sections: sectionsWithLessons || [],
    createdAt: course.created_at,
    updatedAt: course.updated_at
  };
};

const enrollCourse = async (userId, courseId) => {
  const course = await courseModel.getCourseById(parseInt(courseId, 10));
  if (!course || course.status !== 'active') {
    throw ApiError.notFound('Course not found');
  }

  const user = await userModel.getUserById(parseInt(userId, 10));
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const hasAccess = await canAccessCourse({ course, user });
  if (!hasAccess) {
    throw ApiError.forbidden('Rank hiện tại chưa được cấp quyền học khóa này');
  }

  await userCourseService.syncRankCoursesForUser(user.id);

  const existingEnrollment = await userCourseModel.userHasActiveCourse(parseInt(userId, 10), parseInt(courseId, 10));
  if (existingEnrollment) {
    return {
      enrollment: existingEnrollment,
      canAccess: true,
      message: 'Bạn đã được ghi nhận vào khóa học này rồi'
    };
  }

  const enrollment = await userCourseModel.grantCourse({
    userId: parseInt(userId, 10),
    courseId: parseInt(courseId, 10),
    status: 'active'
  });

  return {
    enrollment,
    canAccess: true,
    message: 'Đăng ký khóa học thành công'
  };
};

const checkEnrollment = async (userId, courseId) => {
  const user = await userModel.getUserById(parseInt(userId, 10));
  const course = await courseModel.getCourseById(parseInt(courseId, 10));

  if (!course || course.status !== 'active') {
    return { isEnrolled: false, canAccess: false };
  }

  const enrollment = await userCourseModel.userHasActiveCourse(parseInt(userId, 10), parseInt(courseId, 10));
  const canAccess = await canAccessCourse({ course, user });

  return {
    isEnrolled: !!enrollment,
    canAccess
  };
};

const listCategories = async () => {
  const categories = await categoryModel.getCategories();

  const categoriesWithCourseCounts = await Promise.all(
    categories.map(async (cat) => {
      const courseCount = await courseModel.countCourses({
        categoryId: cat.id,
        status: 'active'
      });
      return {
        id: String(cat.id),
        name: cat.name,
        courseCount: courseCount || 0,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at
      };
    })
  );

  return categoriesWithCourseCounts;
};

const getRankSummaryForUser = async (userId) => {
  const user = await userModel.getUserById(parseInt(userId, 10));
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const rank = user.rank_id ? await rankModel.getRankById(user.rank_id) : null;
  const accessibleCourses = user.role === 'admin' || user.role === 'super_admin'
    ? await courseModel.listCourses({ limit: 10000, offset: 0 })
    : await courseModel.listAccessibleCourses({ user, limit: 1000, offset: 0 });

  return {
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      rank: rank
        ? {
          id: String(rank.id),
          code: rank.code,
          name: rank.name,
          description: rank.description,
          status: rank.status
        }
        : null
    },
    accessibleCourses: accessibleCourses.length,
    rankCourses: user.rank_id ? await rankCourseModel.listRankCourses(user.rank_id) : []
  };
};

const getStudentDashboard = async (userId) => {
  const user = await userModel.getUserById(parseInt(userId, 10));
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  await userCourseService.syncRankCoursesForUser(user.id);

  const rank = user.rank_id ? await rankModel.getRankById(user.rank_id) : null;
  const accessibleCourses = user.role === 'admin' || user.role === 'super_admin'
    ? await courseModel.listCourses({ limit: 1000, offset: 0 })
    : await courseModel.listAccessibleCourses({ user, limit: 1000, offset: 0 });
  const enrolledCourses = await userCourseService.listUserCourses(user.id);
  const accessibleCourseIds = accessibleCourses.map((course) => Number(course.id)).filter(Boolean);
  const progressRows = await courseProgressModel.getUserCourseProgress(user.id, accessibleCourseIds);
  const progressMap = new Map(progressRows.map((row) => [String(row.course_id), row]));
  const accessibleCourseCards = accessibleCourses.map((course) =>
    buildCourseProgressPayload(course, progressMap.get(String(course.id)))
  );
  const enrolledCourseCards = enrolledCourses.map((course) =>
    buildCourseProgressPayload(
      {
        id: course.course_id,
        title: course.title,
        thumbnail_url: course.thumbnail_url,
        price: course.price,
        category_name: course.category_name || course.category || ''
      },
      progressMap.get(String(course.course_id))
    )
  );
  const completedCourses = enrolledCourseCards.filter((course) => course.totalLessons > 0 && course.completedLessons >= course.totalLessons);
  const inProgressCourses = enrolledCourseCards.filter((course) => course.completedLessons > 0 && course.completedLessons < course.totalLessons);
  const averageProgress = enrolledCourseCards.length
    ? Math.round(
      enrolledCourseCards.reduce((sum, course) => sum + Number(course.progress || 0), 0) / enrolledCourseCards.length
    )
    : 0;
  const continueLearning = [...enrolledCourseCards]
    .filter((course) => course.progress > 0 && course.progress < 100)
    .sort((left, right) => new Date(right.lastWatchedAt || right.updatedAt || 0).getTime() - new Date(left.lastWatchedAt || left.updatedAt || 0).getTime());
  const recommendedCourses = accessibleCourseCards
    .filter((course) => course.progress < 100)
    .sort((left, right) => Number(left.progress || 0) - Number(right.progress || 0));
  const recentEnrolled = [...enrolledCourseCards]
    .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime());

  return {
    account: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      rank: formatRankSummary(rank)
    },
    stats: {
      allowedCourses: accessibleCourses.length,
      registeredCourses: enrolledCourseCards.length,
      inProgressCourses: inProgressCourses.length,
      completedCourses: completedCourses.length,
      progressRate: averageProgress,
      averageProgress
    },
    accessibleCourses: accessibleCourseCards,
    enrolledCourses: enrolledCourseCards,
    progress: progressRows,
    continueLearning,
    recommendedCourses,
    recentEnrolled,
    rankSummary: formatRankSummary(rank)
  };
};

const updateVideoProgress = async (userId, courseId, videoId, payload = {}) => {
  const parsedCourseId = parseInt(courseId, 10);
  const parsedVideoId = parseInt(videoId, 10);

  const [user, course, video] = await Promise.all([
    userModel.getUserById(parseInt(userId, 10)),
    courseModel.getCourseById(parsedCourseId),
    videoModel.getVideoById(parsedVideoId)
  ]);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (!course || course.status !== 'active') {
    throw ApiError.notFound('Course not found');
  }

  if (!video || Number(video.course_id) !== parsedCourseId) {
    throw ApiError.notFound('Video not found');
  }

  const hasAccess = await canAccessCourse({ course, user });
  if (!hasAccess) {
    throw ApiError.forbidden('Bạn chưa có quyền truy cập video này');
  }

  await userCourseService.syncRankCoursesForUser(user.id);

  const existingProgress = await courseProgressModel.getProgressByVideo({
    userId: parseInt(userId, 10),
    courseId: parsedCourseId,
    videoId: parsedVideoId
  });

  const videoDuration = clampProgressNumber(payload.durationSeconds || video.duration || existingProgress?.duration_seconds || 0, { min: 0 });
  const watchedSeconds = clampProgressNumber(
    Math.max(
      Number(payload.watchedSeconds || 0),
      Number(existingProgress?.watched_seconds || 0)
    ),
    { min: 0, max: videoDuration > 0 ? videoDuration : null }
  );
  const lastPositionSeconds = clampProgressNumber(
    payload.lastPositionSeconds !== undefined ? payload.lastPositionSeconds : watchedSeconds,
    { min: 0, max: videoDuration > 0 ? videoDuration : null }
  );
  const rawProgressPercent = videoDuration > 0
    ? (watchedSeconds / videoDuration) * 100
    : Number(payload.progressPercent || existingProgress?.progress_percent || 0);
  const progressPercent = clampProgressNumber(Math.max(rawProgressPercent, Number(existingProgress?.progress_percent || 0)), { min: 0, max: 100 });
  const completed = Boolean(payload.completed) || progressPercent >= courseProgressModel.VIDEO_COMPLETION_THRESHOLD;

  const progress = await courseProgressModel.upsertVideoProgress({
    userId: parseInt(userId, 10),
    courseId: parsedCourseId,
    videoId: parsedVideoId,
    watchedSeconds,
    durationSeconds: videoDuration,
    lastPositionSeconds,
    progressPercent,
    completed
  });

  const [courseSummary] = await courseProgressModel.getCourseProgressSummaries(user.id, { courseIds: [parsedCourseId] });

  return {
    progress: {
      videoId: String(parsedVideoId),
      courseId: String(parsedCourseId),
      watchedSeconds: Number(progress?.watched_seconds || 0),
      durationSeconds: Number(progress?.duration_seconds || 0),
      lastPositionSeconds: Number(progress?.last_position_seconds || 0),
      progressPercent: Number(progress?.progress_percent || 0),
      completed: Boolean(progress?.completed),
      completedAt: progress?.completed_at || null,
      lastWatchedAt: progress?.last_watched_at || null
    },
    courseProgress: {
      courseId: String(parsedCourseId),
      totalLessons: Number(courseSummary?.total_lessons || 0),
      completedLessons: Number(courseSummary?.completed_lessons || 0),
      completionPercent: Number(courseSummary?.completion_percent || 0)
    }
  };
};

module.exports = {
  listCourses,
  getCourseById,
  listCategories,
  enrollCourse,
  checkEnrollment,
  getRankSummaryForUser,
  getStudentDashboard,
  updateVideoProgress
};
