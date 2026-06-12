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

  // Cho phép tất cả user có rank được học khóa học (bypass phân quyền Admin)
  return true;
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
  
  // Cho phép tất cả user có rank được học khóa học
  return true;
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
      // Bypass phân quyền, cho phép tất cả các khoá học đối với người dùng có rank
      allowedCourseIds = new Set(items.map((course) => Number(course.id)));
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
  if (!hasAccess) {
    throw ApiError.forbidden('Bạn không có quyền truy cập khóa học này');
  }

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

  const rank = user.rank_id ? await rankModel.getRankById(user.rank_id) : null;
  const accessibleCourses = user.role === 'admin' || user.role === 'super_admin'
    ? await courseModel.listCourses({ limit: 1000, offset: 0 })
    : await courseModel.listAccessibleCourses({ user, limit: 1000, offset: 0 });
  const enrolledCourses = await userCourseModel.listUserCourses(user.id);
  const progressRows = await courseProgressModel.getUserCourseProgress(user.id);

  return {
    account: {
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
    stats: {
      allowedCourses: accessibleCourses.length,
      inProgressCourses: enrolledCourses.length,
      completedCourses: progressRows.filter((row) => Number(row.total_lessons || 0) > 0 && Number(row.completed_lessons || 0) >= Number(row.total_lessons || 0)).length,
      progressRate: accessibleCourses.length ? Math.min(100, Math.round((progressRows.filter((row) => Number(row.total_lessons || 0) > 0 && Number(row.completed_lessons || 0) >= Number(row.total_lessons || 0)).length / accessibleCourses.length) * 100)) : 0
    },
    accessibleCourses: accessibleCourses.slice(0, 6).map((course) => ({
      id: String(course.id),
      title: course.title,
      thumbnail: course.thumbnail_url || '',
      price: String(course.price || 0),
      category: course.category_name || ''
    })),
    enrolledCourses,
    progress: progressRows,
    rankSummary: rank
      ? {
          id: String(rank.id),
          code: rank.code,
          name: rank.name,
          description: rank.description,
          status: rank.status
        }
      : null
  };
};

module.exports = {
  listCourses,
  getCourseById,
  listCategories,
  enrollCourse,
  checkEnrollment,
  getRankSummaryForUser,
  getStudentDashboard
};
