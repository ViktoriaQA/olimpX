import { Router } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     description: Get the profile information of the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const { data: profile, error } = await supabase
      .from('custom_users')
      .select('id, email, first_name, last_name, nickname, role, is_verified, phone_verified, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw createError('Profile not found', 404);
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     description: Update the profile information of the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 description: User nickname
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *                 description: Avatar URL
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to update profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { nickname, avatar_url } = req.body;

    const { data: profile, error } = await supabase
      .from('custom_users')
      .update({
        nickname,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, first_name, last_name, nickname, role, is_verified, phone_verified, created_at, updated_at')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw createError('Failed to update profile', 500);
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/role:
 *   get:
 *     tags: [Users]
 *     summary: Get user role
 *     description: Get the role of the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User role retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: string
 *                   enum: [student, trainer, admin]
 *                   description: User role
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin only)
 *     description: Get a paginated list of all users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/users/{userId}/role:
 *   put:
 *     tags: [Users]
 *     summary: Update user role (Admin only)
 *     description: Update the role of a specific user (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [student, trainer, admin]
 *                 description: New user role
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [student, trainer, admin]
 *       400:
 *         description: Invalid role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to update role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get user statistics
 *     description: Get statistics and activity for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tournaments_count:
 *                   type: integer
 *                   description: Number of tournaments participated
 *                 tasks_count:
 *                   type: integer
 *                   description: Number of tasks completed
 *                 achievements_count:
 *                   type: integer
 *                   description: Number of achievements (top 3 positions)
 *                 recent_activity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [task, tournament]
 *                       title:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       description:
 *                         type: string
 *                   description: Recent user activity
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    // Get tournaments count
    const { count: tournamentsCount, error: tournamentsError } = await supabase
      .from('tournament_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get tasks completed count - count unique tasks that were successfully completed
    const { data: completedTasks, error: tasksError } = await supabase
      .from('task_submissions')
      .select('task_id, tournament_id')
      .eq('user_id', userId)
      .eq('status', 'passed');

    // Count unique tasks (considering tournament_id to distinguish between regular and tournament tasks)
    const uniqueTaskKeys = completedTasks?.map(submission => 
      submission.tournament_id 
        ? `${submission.task_id}-${submission.tournament_id}` 
        : submission.task_id
    ) || [];
    const uniqueTasks = new Set(uniqueTaskKeys);
    const tasksCount = uniqueTasks.size;

    // Get achievements count - count actual achievements (1st, 2nd, 3rd places in tournaments)
    const { count: achievementsCount, error: achievementsError } = await supabase
      .from('tournament_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('rank', 3); // Top 3 positions count as achievements

    // Get recent activity from task submissions and tournament results
    const { data: taskActivity, error: activityError } = await supabase
      .from('task_submissions')
      .select(`
        id,
        status,
        score,
        submitted_at,
        tasks!inner(title),
        tournaments!inner(title)
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(5);

    const { data: tournamentActivity, error: tournamentError } = await supabase
      .from('tournament_results')
      .select(`
        rank,
        total_score,
        tournaments!inner(title, status)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5);

    const formattedTaskActivity = taskActivity?.map((activity: any) => ({
      type: 'task' as const,
      title: activity.tasks?.title || 'Unknown Task',
      date: activity.submitted_at,
      description: `Score: ${activity.score || 0}% - ${activity.tournaments?.title || 'Practice'}`
    })) || [];

    const formattedTournamentActivity = tournamentActivity?.map((result: any) => ({
      type: 'tournament' as const,
      title: result.tournaments?.title || 'Unknown Tournament',
      date: result.updated_at,
      description: `${result.rank === 1 ? '🥇 1st' : result.rank === 2 ? '🥈 2nd' : result.rank === 3 ? '🥉 3rd' : `${result.rank}th`} place - Score: ${result.total_score || 0}`
    })) || [];

    const allActivity = [...formattedTaskActivity, ...formattedTournamentActivity]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    const stats = {
      tournaments_count: tournamentsCount || 0,
      tasks_count: tasksCount || 0,
      achievements_count: achievementsCount || 0,
      recent_activity: allActivity
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/subscription:
 *   get:
 *     tags: [Users]
 *     summary: Get user subscription info
 *     description: Get subscription information for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       type: string
 *                       description: Subscription plan name
 *                     status:
 *                       type: string
 *                       enum: [active, inactive, expired]
 *                       description: Subscription status
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                       description: Subscription expiry date
 *                     features:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of subscription features
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch subscription info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/subscription', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    // First check user_subscriptions for active subscription
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!error && subscription) {
      // Return active subscription from user_subscriptions
      const subscriptionInfo = {
        plan: subscription.subscription_plans.name,
        status: subscription.status,
        expires_at: subscription.end_date,
        features: subscription.subscription_plans.features || []
      };

      res.json({ subscription: subscriptionInfo });
      return;
    }

    // If no active subscription, check payment_attempts for completed payments
    const { data: paymentAttempt, error: paymentError } = await supabase
      .from('payment_attempts')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!paymentError && paymentAttempt) {
      // Return subscription based on latest completed payment
      const subscriptionInfo = {
        plan: paymentAttempt.subscription_plans.name,
        status: 'active',
        expires_at: null, // Could calculate based on payment date
        features: paymentAttempt.subscription_plans.features || []
      };

      res.json({ subscription: subscriptionInfo });
      return;
    }

    // Return default free subscription if nothing found
    res.json({
      subscription: {
        plan: 'Free',
        status: 'active',
        features: ['Basic tournaments', 'Limited tasks']
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/students:
 *   get:
 *     tags: [Users]
 *     summary: Get all students (Trainer/Admin only)
 *     description: Get a list of all students (Trainer/Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 students:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Trainer/Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch students
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
