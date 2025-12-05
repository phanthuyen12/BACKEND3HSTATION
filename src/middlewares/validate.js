const Joi = require('joi');
const { errorResponse } = require('../utils/response');

const validationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true
};

const validate = (schemas) => (req, res, next) => {
  const targets = ['params', 'query', 'body'];
  const details = [];

  targets.forEach((target) => {
    if (schemas[target] && Joi.isSchema(schemas[target])) {
      const result = schemas[target].validate(req[target], validationOptions);
      if (result.error) {
        details.push(...result.error.details.map((d) => d.message));
      } else {
        req[target] = result.value;
      }
    }
  });

  if (details.length) {
    return errorResponse(res, 'Validation error', 422, details);
  }

  return next();
};

module.exports = validate;

