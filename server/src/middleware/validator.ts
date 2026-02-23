/**
 * Request Validator Middleware
 * Validates incoming requests using Joi schemas
 */

import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { ApiError } from '../utils/ApiError';

export class ValidatorMiddleware {
  /**
   * Validate request body
   */
  static body(schema: Schema) {
    return (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return next(
          new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed', details)
        );
      }

      req.body = value;
      next();
    };
  }

  /**
   * Validate request query
   */
  static query(schema: Schema) {
    return (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return next(
          new ApiError(400, 'VALIDATION_ERROR', 'Query validation failed', details)
        );
      }

      req.query = value;
      next();
    };
  }

  /**
   * Validate request params
   */
  static params(schema: Schema) {
    return (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return next(
          new ApiError(400, 'VALIDATION_ERROR', 'Params validation failed', details)
        );
      }

      req.params = value;
      next();
    };
  }
}
