const successResponse = (res, data = {}, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    message
  });
};

const errorResponse = (res, message = 'Error', status = 400, errors) => {
  const payload = {
    success: false,
    message
  };

  if (errors) {
    payload.errors = errors;
  }

  return res.status(status).json(payload);
};

module.exports = {
  successResponse,
  errorResponse
};

















