const ApiError = require('../utils/apiError');
const paymentModel = require('../models/paymentModel');
const userCourseModel = require('../models/userCourseModel');

const createPayment = async ({ userId, courseId, price, method }) => {
  const existingOwnership = await userCourseModel.userHasActiveCourse(userId, courseId);
  if (existingOwnership) {
    throw ApiError.badRequest('User already owns this course');
  }

  return paymentModel.createPayment({
    userId,
    courseId,
    price,
    method,
    status: 'pending'
  });
};

const updatePaymentStatus = async ({ paymentId, status, metadata }) => {
  const payment = await paymentModel.getPaymentById(paymentId);
  if (!payment) {
    throw ApiError.notFound('Payment not found');
  }

  const updated = await paymentModel.updatePaymentStatus(paymentId, status, metadata);

  if (status === 'success') {
    await userCourseModel.grantCourse({
      userId: updated.user_id,
      courseId: updated.course_id,
      status: 'active'
    });
  }

  return updated;
};

const getPaymentById = async (id) => {
  const payment = await paymentModel.getPaymentById(id);
  if (!payment) {
    throw ApiError.notFound('Payment not found');
  }
  return payment;
};

const getUserPayments = (userId) => paymentModel.getUserPayments(userId);

module.exports = {
  createPayment,
  updatePaymentStatus,
  getPaymentById,
  getUserPayments
};

