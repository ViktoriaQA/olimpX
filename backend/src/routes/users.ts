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
      .from('custom_users')
      .select('id, email, first_name, last_name, nickname, role, is_verified, phone_verified, created_at, updated_at, subscription_status, subscription_plan, subscription_expires_at')
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

// Update user profile
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
      .select('id, email, first_name, last_name, nickname, role, is_verified, phone_verified, created_at, updated_at, subscription_status, subscription_plan, subscription_expires_at')
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

// Get user statistics
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

// Get user subscription info
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
      // Check if this subscription has auto-renewal enabled
      const { data: recurringSub, error: recurringError } = await supabase
        .from('recurring_subscriptions')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('is_active', true)
        .eq('status', 'active')
        .single();

      const autoRenewal = !recurringError && recurringSub ? true : false;

      // Return active subscription from user_subscriptions
      const subscriptionInfo = {
        plan: subscription.subscription_plans.name,
        status: subscription.status,
        expires_at: subscription.end_date,
        features: subscription.subscription_plans.features || [],
        auto_renewal: autoRenewal,
        subscription_id: subscription.id
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
        features: paymentAttempt.subscription_plans.features || [],
        auto_renewal: false // No recurring subscription setup
      };

      res.json({ subscription: subscriptionInfo });
      return;
    }

    // Return default free subscription if nothing found
    res.json({
      subscription: {
        plan: 'Free',
        status: 'active',
        features: ['Basic tournaments', 'Limited tasks'],
        auto_renewal: false
      }
    });
  } catch (error) {
    console.error('Error fetching user subscription info:', error);
    next(error);
  }
});

// Admin: Get students
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

// Admin: Get all users with subscription info
router.get('/admin/all', requireRole(['admin']), async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: users, error, count } = await supabase
      .from('custom_users')
      .select(`
        id, email, first_name, last_name, nickname, role, is_verified, phone_verified, created_at, updated_at
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw createError('Failed to fetch users', 500);
    }

    // Get subscription info for each user
    const usersWithSubscriptions = await Promise.all(
      users.map(async (user: any) => {
        // Check user_subscriptions for active subscription
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans (*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        // If no active subscription, check payment_attempts for completed payments
        let paymentSubscription = null;
        if (!subscription) {
          const { data: paymentAttempt } = await supabase
            .from('payment_attempts')
            .select(`
              *,
              subscription_plans (*)
            `)
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (paymentAttempt) {
            paymentSubscription = {
              plan: paymentAttempt.subscription_plans?.name || 'Unknown',
              status: 'active',
              expires_at: null,
              features: paymentAttempt.subscription_plans?.features || [],
              payment_id: paymentAttempt.id,
              order_id: paymentAttempt.order_id
            };
          }
        }

        const subscriptionInfo = subscription ? {
          plan: subscription.subscription_plans?.name || 'Unknown',
          status: subscription.status,
          expires_at: subscription.end_date,
          features: subscription.subscription_plans?.features || [],
          subscription_id: subscription.id,
          auto_renewal: false // Will be updated below
        } : paymentSubscription || {
          plan: 'Free',
          status: 'active',
          expires_at: null,
          features: ['Basic tournaments', 'Limited tasks'],
          auto_renewal: false
        };

        // Check auto-renewal status if subscription exists
        if (subscription) {
          const { data: recurringSub, error: recurringError } = await supabase
            .from('recurring_subscriptions')
            .select('*')
            .eq('subscription_id', subscription.id)
            .eq('is_active', true)
            .eq('status', 'active')
            .single();

          subscriptionInfo.auto_renewal = !recurringError && recurringSub ? true : false;
        }

        return {
          ...user,
          subscription: subscriptionInfo
        };
      })
    );

    res.json({
      users: usersWithSubscriptions,
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

// Admin: Cancel user subscription
router.post('/admin/:userId/cancel-subscription', requireRole(['admin']), async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw createError('User not found', 404);
    }

    // Cancel active subscription in user_subscriptions
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();

    if (subscriptionError) {
      // If no active subscription in user_subscriptions, try to cancel recurring payment
      const { data: paymentAttempt, error: paymentError } = await supabase
        .from('payment_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .eq('order_type', 'recurring')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!paymentError && paymentAttempt) {
        // Mark the recurring payment as cancelled
        await supabase
          .from('payment_attempts')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentAttempt.id);
      }
    }

    res.json({ 
      message: 'Subscription cancelled successfully',
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete user (only student/trainer roles) with all related data
router.delete('/admin/:userId', requireRole(['admin']), async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    // Check if user exists and get role
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw createError('User not found', 404);
    }

    // Only allow deletion of student and trainer roles
    if (!['student', 'trainer'].includes(user.role)) {
      throw createError('Cannot delete admin users', 403);
    }

    // Start a transaction to delete all related data
    const { error: deleteError } = await supabase.rpc('delete_user_cascade', { 
      target_user_id: userId 
    });

    if (deleteError) {
      console.error('Cascade delete error:', deleteError);
      throw createError('Failed to delete user and related data', 500);
    }

    res.json({ 
      message: 'User and all related data deleted successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;