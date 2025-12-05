const courseModel = require('../../models/elearning/courseModel');
const categoryModel = require('../../models/categoryModel');
const { buildPagination } = require('../../utils/pagination');

const listCourses = async ({ page, limit, search, category }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  
  const categoryId = category ? parseInt(category) : null;
  
  // Only get active courses
  const [items, total] = await Promise.all([
    courseModel.listCourses({
      categoryId,
      search,
      status: 'active',
      limit: take,
      offset
    }),
    courseModel.countCourses({ categoryId, search, status: 'active' })
  ]);

  // Debug: Log if no courses found (remove in production)
  if (process.env.NODE_ENV !== 'production' && items.length === 0 && total === 0) {
    console.log('[DEBUG] No active courses found. Check if courses have status="active" in database.');
  }

  const formattedItems = items.map(course => ({
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
    updatedAt: course.updated_at
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

const ApiError = require('../../utils/apiError');
const userCourseModel = require('../../models/userCourseModel');
const userModel = require('../../models/userModel');
const orderModel = require('../../models/orders/orderModel');
const paymentModel = require('../../models/paymentModel');

const getCourseById = async (id) => {
  const course = await courseModel.getCourseById(parseInt(id));
  if (!course || course.status !== 'active') {
    throw ApiError.notFound('Course not found');
  }

  const sections = await courseModel.getCourseSections(parseInt(id));
  
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
    sections: sections || [],
    createdAt: course.created_at,
    updatedAt: course.updated_at
  };
};

const enrollCourse = async (userId, courseId) => {
  // Check if course exists
  const course = await courseModel.getCourseById(parseInt(courseId));
  if (!course || course.status !== 'active') {
    throw ApiError.notFound('Course not found');
  }

  // Check if user already enrolled
  const existingEnrollment = await userCourseModel.userHasActiveCourse(parseInt(userId), parseInt(courseId));
  if (existingEnrollment) {
    throw ApiError.badRequest('Bạn đã đăng ký khóa học này rồi');
  }

  // Get user balance
  const user = await userModel.getUserById(parseInt(userId));
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const coursePrice = parseFloat(course.price || 0);
  const isFree = course.is_free || coursePrice === 0;

  // If course is not free, check balance and deduct
  if (!isFree && coursePrice > 0) {
    const userBalance = parseFloat(user.balance || 0);
    if (userBalance < coursePrice) {
      throw ApiError.badRequest('Số dư tài khoản không đủ để đăng ký khóa học này');
    }

    // Deduct balance
    const newBalance = userBalance - coursePrice;
    await userModel.updateUser(parseInt(userId), { balance: newBalance });
  }

  // Start transaction: create order, payment, and enrollment
  try {
    // Create order
    const order = await orderModel.createOrder({
      userId: parseInt(userId),
      type: 'course',
      itemId: String(courseId),
      amount: coursePrice,
      paymentMethod: 'balance',
      status: isFree ? 'paid' : 'paid'
    });

    // Create payment record if not free
    let payment = null;
    if (!isFree && coursePrice > 0) {
      payment = await paymentModel.createPayment({
        userId: parseInt(userId),
        courseId: parseInt(courseId),
        price: coursePrice,
        method: 'balance',
        status: 'success',
        metadata: { orderId: order.id }
      });
    }

    // Grant course to user
    const enrollment = await userCourseModel.grantCourse({
      userId: parseInt(userId),
      courseId: parseInt(courseId),
      status: 'active'
    });

    return {
      enrollment,
      order,
      payment,
      message: 'Đăng ký khóa học thành công'
    };
  } catch (error) {
    // Rollback: refund balance if deducted
    if (!isFree && coursePrice > 0) {
      const user = await userModel.getUserById(parseInt(userId));
      const currentBalance = parseFloat(user.balance || 0);
      await userModel.updateUser(parseInt(userId), { balance: currentBalance + coursePrice });
    }
    throw error;
  }
};

const checkEnrollment = async (userId, courseId) => {
  const enrollment = await userCourseModel.userHasActiveCourse(parseInt(userId), parseInt(courseId));
  return { isEnrolled: !!enrollment };
};

const listCategories = async () => {
  const categories = await categoryModel.getCategories();
  
  // Return all categories with their course counts (including categories with 0 courses)
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

module.exports = {
  listCourses,
  getCourseById,
  listCategories,
  enrollCourse,
  checkEnrollment
};

