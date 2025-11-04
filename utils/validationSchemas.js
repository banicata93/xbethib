const Joi = require('joi');

/**
 * Validation schemas for API requests
 */

const predictionSchema = Joi.object({
    matchDate: Joi.date().required().messages({
        'date.base': 'Match date must be a valid date',
        'any.required': 'Match date is required'
    }),
    homeTeam: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Home team name must be at least 2 characters',
        'string.max': 'Home team name must not exceed 100 characters',
        'any.required': 'Home team is required'
    }),
    awayTeam: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Away team name must be at least 2 characters',
        'string.max': 'Away team name must not exceed 100 characters',
        'any.required': 'Away team is required'
    }),
    leagueFlag: Joi.string().max(16).required().messages({
        'string.max': 'League flag must not exceed 16 characters',
        'any.required': 'League flag is required'
    }),
    prediction: Joi.string().min(2).max(200).required().messages({
        'string.min': 'Prediction must be at least 2 characters',
        'string.max': 'Prediction must not exceed 200 characters',
        'any.required': 'Prediction is required'
    }),
    odds: Joi.number().min(1.01).max(100).optional().allow(null).messages({
        'number.min': 'Odds must be at least 1.01',
        'number.max': 'Odds must not exceed 100'
    }),
    homeTeamFlag: Joi.string().max(16).optional().allow(''),
    awayTeamFlag: Joi.string().max(16).optional().allow('')
});

const loginSchema = Joi.object({
    username: Joi.string().min(3).max(50).required().messages({
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username must not exceed 50 characters',
        'any.required': 'Username is required'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
    })
});

const resultUpdateSchema = Joi.object({
    result: Joi.string().valid('pending', 'win', 'loss', 'void').required().messages({
        'any.only': 'Result must be one of: pending, win, loss, void',
        'any.required': 'Result is required'
    })
});

const matchOfTheDaySchema = Joi.object({
    homeTeam: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        logo: Joi.string().max(5000000).optional().allow('') // Allow large base64 images (up to 5MB)
    }).required(),
    awayTeam: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        logo: Joi.string().max(5000000).optional().allow('') // Allow large base64 images (up to 5MB)
    }).required(),
    time: Joi.string().required(),
    prediction: Joi.string().min(2).max(200).required(),
    preview: Joi.string().min(10).max(1000).required()
});

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            
            return res.status(400).json({
                message: 'Validation error',
                errors
            });
        }
        
        req.body = value;
        next();
    };
}

module.exports = {
    predictionSchema,
    loginSchema,
    resultUpdateSchema,
    matchOfTheDaySchema,
    validate
};
