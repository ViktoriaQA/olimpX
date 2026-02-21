import { Request, Response, NextFunction } from 'express';

// Simple validation without express-validator for now
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Basic validation - can be enhanced later
  next();
};

export const body = (field: string) => ({
  notEmpty: () => ({
    withMessage: (message: string) => ({
      field,
      message
    })
  }),
  isIn: (values: string[]) => ({
    withMessage: (message: string) => ({
      field,
      message
    })
  })
});

export const param = (field: string) => ({
  notEmpty: () => ({
    withMessage: (message: string) => ({
      field,
      message
    })
  })
});
