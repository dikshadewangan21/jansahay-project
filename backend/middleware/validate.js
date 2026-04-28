const { validationResult } = require('express-validator');

/**
 * Runs a chain of express-validator rules and short-circuits with 422
 * if any fail, returning structured error details.
 */
function validate(rules) {
  return async (req, res, next) => {
    await Promise.all(rules.map((rule) => rule.run(req)));

    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.array().map((e) => ({
          field: e.path,
          message: e.msg,
          value: e.value,
        })),
      });
    }
    next();
  };
}

module.exports = { validate };
