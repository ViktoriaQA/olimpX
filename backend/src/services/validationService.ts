import Joi from 'joi';

const phoneRegex = /^\+?[1-9]\d{1,14}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const profileUpdateSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).optional(),
  last_name: Joi.string().min(2).max(50).optional(),
  nickname: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(phoneRegex).optional(),
  country_code: Joi.string().pattern(/^\+\d{1,3}$/).optional()
}).min(1); // At least one field must be provided

export const registerSchema = Joi.object({
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().pattern(phoneRegex).optional().allow(''),
  country_code: Joi.string().pattern(/^\+\d{1,3}$/).optional().allow(''),
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  role: Joi.string().valid('user', 'admin', 'student', 'trainer').optional()
}).custom((value, helpers) => {
  if (!value.email && !value.phone) {
    return helpers.error('custom.emailOrPhoneRequired');
  }
  return value;
}, 'Email or phone validation');

export const loginSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(phoneRegex).optional(),
  password: Joi.string().required()
}).custom((value, helpers) => {
  if (!value.email && !value.phone) {
    return helpers.error('custom.emailOrPhoneRequired');
  }
  return value;
}, 'Email or phone validation');

export class ValidationService {
  static validateRegister(data: any) {
    const { error, value } = registerSchema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  }

  static validateLogin(data: any) {
    const { error, value } = loginSchema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  }

  static validateProfileUpdate(data: any) {
    const { error, value } = profileUpdateSchema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  }

  static normalizePhone(phone: string, countryCode?: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters except + at the beginning
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // If no country code and phone doesn't start with +, add default
    if (!normalized.startsWith('+') && countryCode) {
      normalized = countryCode + normalized.replace(/^0/, '');
    } else if (!normalized.startsWith('+')) {
      normalized = '+' + normalized.replace(/^0/, '');
    }
    
    return normalized;
  }

  static validatePasswordStrength(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 digit
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  }
}
