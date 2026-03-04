import { Router } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Get current user profile
router.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw createError('Profile not found', 404);
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { nickname, avatar_url } = req.body;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        nickname,
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw createError('Failed to update profile', 500);
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

// Get user role
router.get('/role', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const { data: user, error } = await supabase
      .from('custom_users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      throw createError('Role not found', 404);
    }

    res.json({ role: user.role });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all users (paginated)
router.get('/', requireRole(['admin']), async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: users, error, count } = await supabase
      .from('custom_users')
      .select(`
        id, email, first_name, last_name, nickname, role, is_verified, phone_verified, created_at, updated_at
      `, { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw createError('Failed to fetch users', 500);
    }

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Update user role
router.put('/:userId/role', requireRole(['admin']), async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['student', 'trainer', 'admin'].includes(role)) {
      throw createError('Invalid role', 400);
    }

    const { data: user, error } = await supabase
      .from('custom_users')
      .update({ role })
      .eq('id', userId)
      .select('id, role')
      .single();

    if (error) {
      throw createError('Failed to update role', 500);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Get students
router.get('/students', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { data: students, error } = await supabase
      .from('custom_users')
      .select(`
        id, email, first_name, last_name, nickname, role, is_verified, phone_verified, created_at, updated_at
      `)
      .eq('role', 'student');

    if (error) {
      throw createError('Failed to fetch students', 500);
    }

    res.json({ students });
  } catch (error) {
    next(error);
  }
});

export default router;