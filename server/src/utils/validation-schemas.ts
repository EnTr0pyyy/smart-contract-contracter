/**
 * Joi Validation Schemas
 * Input validation for all API endpoints
 */

import Joi from 'joi';

export const analyzeRequestSchema = Joi.object({
  input: Joi.string()
    .required()
    .max(1048576) // Max 1MB
    .messages({
      'string.base': 'Input must be a string',
      'string.empty': 'Input cannot be empty',
      'string.max': 'Input exceeds maximum size of 1MB',
      'any.required': 'Input is required',
    }),
  
  chain: Joi.string()
    .valid('ethereum', 'polygon', 'bsc')
    .required()
    .messages({
      'any.only': 'Chain must be one of: ethereum, polygon, bsc',
      'any.required': 'Chain is required',
    }),
  
  mode: Joi.string()
    .valid('BEGINNER', 'DEVELOPER')
    .default('BEGINNER')
    .messages({
      'any.only': 'Mode must be BEGINNER or DEVELOPER',
    }),
});

export const compareRequestSchema = Joi.object({
  analysis_id_a: Joi.string()
    .required()
    .messages({
      'any.required': 'Analysis ID A is required',
    }),
  
  analysis_id_b: Joi.string()
    .required()
    .messages({
      'any.required': 'Analysis ID B is required',
    }),
});

export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  
  sortBy: Joi.string()
    .valid('createdAt', 'riskScore', 'chain')
    .default('createdAt'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
});

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
      'any.required': 'Password is required',
    }),
  
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
});
