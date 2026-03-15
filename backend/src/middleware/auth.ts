import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { supabase } from '../utils/supabase';
import { JWTService } from '../services/jwtService';

/**
 * Extended request interface that includes authenticated user information
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

/**
 * Authentication middleware that verifies JWT tokens and sets user context
 * @param req - Express request object with AuthRequest interface
 * @param res - Express response object
 * @param next - Express next function
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      throw createError('Access token required', 401);
    }

    // Try JWT verification first (for regular auth endpoints)
    try {
      const decoded = JWTService.verifyJWT(token);
      
      // Get user role from custom_users table
      const { data: user, error } = await supabase
        .from('custom_users')
        .select('role')
        .eq('id', decoded.sub)
        .single();
      
      // If RLS blocks access, try with service role
      let userRole = user?.role;
      if (error && !user) {
        // Fallback: use role from JWT if available
        userRole = decoded.role;
      } else {
        userRole = user?.role ?? decoded.role;
      }

      req.user = {
        id: decoded.sub,
        email: decoded.email || '',
        role: userRole
      };

      next();
      return;
    } catch (jwtError) {
      // If JWT fails, try Supabase token (for Supabase auth)
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw createError('Invalid or expired token', 401);
      }

      // Get user role from custom_users table
      const { data: userData, error: roleError } = await supabase
        .from('custom_users')
        .select('role')
        .eq('id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: user.email || '',
        role: userData?.role
      };

      next();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control middleware factory
 * Creates a middleware function that checks if user has required role
 * @param allowedRoles - Array of role names that are allowed to access the resource
 * @returns Express middleware function
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    console.log('requireRole check - User role:', req.user?.role, 'Allowed roles:', allowedRoles);
    
    // Check if user exists and has role
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      console.log('Permission denied - User role:', req.user?.role, 'Required:', allowedRoles);
      next(createError('Insufficient permissions', 403));
      return;
    }
    console.log('Permission granted for role:', req.user?.role);
    next();
  };
};