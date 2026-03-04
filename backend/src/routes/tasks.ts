import { Router } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Get all tasks (with filtering)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { difficulty, category, page = 1, limit = 20, tournament_id } = req.query;

    let query;
    
    if (tournament_id) {
      // Get tournament-specific tasks
      query = supabase
        .from('tournament_tasks')
        .select('*')
        .eq('tournament_id', tournament_id)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
    } else {
      // Get general tasks
      query = supabase
        .from('tasks')
        .select('*')
        .eq('is_public', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: tasks, error, count } = await query
      .range(
        (Number(page) - 1) * Number(limit),
        Number(page) * Number(limit) - 1
      );

    if (error) {
      throw createError('Failed to fetch tasks', 500);
    }

    res.json({
      tasks: tasks || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get task by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { tournament_id } = req.query;

    let task;
    let error;

    if (tournament_id) {
      // Get tournament task
      const result = await supabase
        .from('tournament_tasks')
        .select('*')
        .eq('id', id)
        .eq('tournament_id', tournament_id)
        .eq('is_active', true)
        .single();
      
      task = result.data;
      error = result.error;
    } else {
      // Get general task
      const result = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .eq('is_active', true)
        .single();
      
      task = result.data;
      error = result.error;
    }

    if (error || !task) {
      throw createError('Task not found', 404);
    }

    // Remove test cases from response
    const { test_cases, ...taskWithoutTests } = task;

    res.json({ task: taskWithoutTests });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Create task
router.post('/', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { tournament_id, ...taskData } = req.body;
    const userId = req.user!.id;

    let task;
    let error;

    if (tournament_id) {
      // Check if user can add tasks to this tournament
      const { data: tournament, error: checkError } = await supabase
        .from('tournaments')
        .select('created_by')
        .eq('id', tournament_id)
        .single();

      if (checkError || !tournament) {
        throw createError('Tournament not found', 404);
      }

      if (tournament.created_by !== userId && req.user!.role !== 'admin') {
        throw createError('Not authorized to add tasks to this tournament', 403);
      }

      // Create tournament task
      const result = await supabase
        .from('tournament_tasks')
        .insert({
          ...taskData,
          tournament_id,
          created_by: userId
        })
        .select()
        .single();
      
      task = result.data;
      error = result.error;
    } else {
      // Create general task
      const result = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_by: userId
        })
        .select()
        .single();
      
      task = result.data;
      error = result.error;
    }

    if (error) {
      throw createError('Failed to create task', 500);
    }

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Update task
router.put('/:id', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { tournament_id, ...updates } = req.body;
    const userId = req.user!.id;

    let task;
    let error;

    if (tournament_id) {
      // Check if user can update tasks in this tournament
      const { data: tournament, error: checkError } = await supabase
        .from('tournaments')
        .select('created_by')
        .eq('id', tournament_id)
        .single();

      if (checkError || !tournament) {
        throw createError('Tournament not found', 404);
      }

      if (tournament.created_by !== userId && req.user!.role !== 'admin') {
        throw createError('Not authorized to update tasks in this tournament', 403);
      }

      // Update tournament task
      const result = await supabase
        .from('tournament_tasks')
        .update(updates)
        .eq('id', id)
        .eq('tournament_id', tournament_id)
        .select()
        .single();
      
      task = result.data;
      error = result.error;
    } else {
      // Update general task
      const result = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      task = result.data;
      error = result.error;
    }

    if (error || !task) {
      throw createError('Task not found or update failed', 404);
    }

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Delete (deactivate) task
router.delete('/:id', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { tournament_id } = req.query;
    const userId = req.user!.id;

    let task;
    let error;

    if (tournament_id) {
      // Check if user can manage tasks in this tournament
      const { data: tournament, error: checkError } = await supabase
        .from('tournaments')
        .select('created_by')
        .eq('id', tournament_id)
        .single();

      if (checkError || !tournament) {
        throw createError('Tournament not found', 404);
      }

      if (tournament.created_by !== userId && req.user!.role !== 'admin') {
        throw createError('Not authorized to delete tasks in this tournament', 403);
      }

      // Soft delete tournament task
      const result = await supabase
        .from('tournament_tasks')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tournament_id', tournament_id)
        .select()
        .single();

      task = result.data;
      error = result.error;
    } else {
      // Soft delete general task
      const result = await supabase
        .from('tasks')
        .update({ is_active: false, is_public: false })
        .eq('id', id)
        .select()
        .single();

      task = result.data;
      error = result.error;
    }

    if (error || !task) {
      throw createError('Task not found or delete failed', 404);
    }

    res.json({
      message: 'Task deleted successfully',
      task
    });
  } catch (error) {
    next(error);
  }
});

// Submit solution to task
router.post('/:id/submit', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { code, language, tournament_id } = req.body;
    const userId = req.user!.id;

    // Get task details
    let task;
    let error;

    if (tournament_id) {
      const result = await supabase
        .from('tournament_tasks')
        .select('*')
        .eq('id', id)
        .eq('tournament_id', tournament_id)
        .eq('is_active', true)
        .single();
      
      task = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .eq('is_active', true)
        .single();
      
      task = result.data;
      error = result.error;
    }

    if (error || !task) {
      throw createError('Task not found', 404);
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .insert({
        task_id: id,
        user_id: userId,
        tournament_id: tournament_id || null,
        code,
        language,
        status: 'pending'
      })
      .select()
      .single();

    if (submissionError) {
      throw createError('Failed to create submission', 500);
    }

    // TODO: Trigger code execution service
    // This would involve:
    // 1. Run code against test cases
    // 2. Evaluate result
    // 3. Update submission status and score
    // 4. Update user progress
    // 5. Update tournament results if applicable

    res.json({
      message: 'Solution submitted successfully',
      submission: {
        ...submission,
        status: 'pending'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's submissions for a task
router.get('/:id/submissions', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { tournament_id } = req.query;
    const userId = req.user!.id;

    let query = supabase
      .from('task_submissions')
      .select('*')
      .eq('task_id', id)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (tournament_id) {
      query = query.eq('tournament_id', tournament_id);
    }

    const { data: submissions, error } = await query;

    if (error) {
      throw createError('Failed to fetch submissions', 500);
    }

    res.json({ submissions: submissions || [] });
  } catch (error) {
    next(error);
  }
});

// Get user's progress on tasks
router.get('/progress', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { tournament_id } = req.query;

    let query;

    if (tournament_id) {
      // Get tournament progress
      query = supabase
        .from('user_progress')
        .select(`
          *,
          tournament_task:tournament_tasks(id, title, difficulty, points)
        `)
        .eq('user_id', userId)
        .not('tournament_task_id', 'is', null);
    } else {
      // Get general progress
      query = supabase
        .from('user_progress')
        .select(`
          *,
          task:tasks(id, title, difficulty, points)
        `)
        .eq('user_id', userId)
        .not('task_id', 'is', null);
    }

    const { data: progress, error } = await query;

    if (error) {
      throw createError('Failed to fetch progress', 500);
    }

    const stats = {
      total_solved: progress?.filter(p => p.status === 'completed').length || 0,
      total_attempted: progress?.filter(p => p.status !== 'not_started').length || 0,
      by_difficulty: {
        easy: progress?.filter(p => p.status === 'completed' && (p.task?.difficulty === 'easy' || p.tournament_task?.difficulty === 'easy')).length || 0,
        medium: progress?.filter(p => p.status === 'completed' && (p.task?.difficulty === 'medium' || p.tournament_task?.difficulty === 'medium')).length || 0,
        hard: progress?.filter(p => p.status === 'completed' && (p.task?.difficulty === 'hard' || p.tournament_task?.difficulty === 'hard')).length || 0
      },
      recent_activity: progress?.slice(0, 10) || []
    };

    res.json({
      progress: stats,
      detailed_progress: progress || []
    });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Get task statistics
router.get('/:id/stats', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { tournament_id } = req.query;

    // Get submissions for this task
    let query = supabase
      .from('task_submissions')
      .select('*')
      .eq('task_id', id);

    if (tournament_id) {
      query = query.eq('tournament_id', tournament_id);
    }

    const { data: submissions, error } = await query;

    if (error) {
      throw createError('Failed to fetch task statistics', 500);
    }

    const totalSubmissions = submissions?.length || 0;
    const successfulSubmissions = submissions?.filter(s => s.status === 'passed').length || 0;
    const successRate = totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions) * 100 : 0;
    
    // Calculate average attempts per user
    const userAttempts = submissions?.reduce((acc, submission) => {
      acc[submission.user_id] = (acc[submission.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const userAttemptsValues = Object.values(userAttempts as Record<string, number>) as number[];
    
    const averageAttempts = userAttemptsValues.length > 0
      ? userAttemptsValues.reduce((sum, attempts) => sum + attempts, 0) / userAttemptsValues.length
      : 0;

    // Get popular languages
    const languageStats = submissions?.reduce((acc, submission) => {
      acc[submission.language] = (acc[submission.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const popularLanguages = Object.entries(languageStats as Record<string, number>)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([language, count]) => ({ language, count }));

    res.json({
      stats: {
        total_submissions: totalSubmissions,
        success_rate: Math.round(successRate * 100) / 100,
        average_attempts: Math.round(averageAttempts * 100) / 100,
        popular_languages: popularLanguages,
        successful_submissions: successfulSubmissions,
        failed_submissions: submissions?.filter(s => s.status === 'failed').length || 0,
        pending_submissions: submissions?.filter(s => s.status === 'pending').length || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;