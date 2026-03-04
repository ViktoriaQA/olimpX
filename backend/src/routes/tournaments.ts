import { Router } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Get all tournaments
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('tournaments')
      .select(`
        *,
        creator:created_by(id, first_name, last_name, email),
        _count:tournament_participants(count)
      `)
      .order('start_time', { ascending: true })
      .range(
        (Number(page) - 1) * Number(limit),
        Number(page) * Number(limit) - 1
      );

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tournaments, error } = await query;

    if (error) {
      throw createError('Failed to fetch tournaments', 500);
    }

    res.json({
      tournaments: tournaments || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: tournaments?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get tournament by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        creator:created_by(id, first_name, last_name, email),
        tasks:tournament_tasks(*),
        participants:tournament_participants(
          joined_at,
          status,
          user:custom_users(id, first_name, last_name, email)
        ),
        _count:tournament_participants(count)
      `)
      .eq('id', id)
      .single();

    if (error || !tournament) {
      throw createError('Tournament not found', 404);
    }

    res.json({ tournament });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Create tournament
router.post('/', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const tournamentData = req.body;
    const userId = req.user!.id;

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        ...tournamentData,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      throw createError('Failed to create tournament', 500);
    }

    res.status(201).json({
      message: 'Tournament created successfully',
      tournament
    });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Update tournament
router.put('/:id', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user!.id;

    // Check if user is the creator or admin
    const { data: existing, error: checkError } = await supabase
      .from('tournaments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      throw createError('Tournament not found', 404);
    }

    if (existing.created_by !== userId && req.user!.role !== 'admin') {
      throw createError('Not authorized to update this tournament', 403);
    }

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw createError('Failed to update tournament', 500);
    }

    res.json({
      message: 'Tournament updated successfully',
      tournament
    });
  } catch (error) {
    next(error);
  }
});

// Join tournament (students only)
router.post('/:id/join', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user is a student
    if (req.user!.role !== 'student') {
      throw createError('Only students can join tournaments', 403);
    }

    // Check if tournament exists and is joinable
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('status, max_participants, start_time')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      throw createError('Tournament not found', 404);
    }

    if (tournament.status !== 'upcoming') {
      throw createError('Cannot join a tournament that is not upcoming', 400);
    }

    // Check participant limit
    if (tournament.max_participants) {
      const { count } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', id);

      if (count && count >= tournament.max_participants) {
        throw createError('Tournament is full', 400);
      }
    }

    // Add participant
    const { data: participant, error } = await supabase
      .from('tournament_participants')
      .insert({
        tournament_id: id,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw createError('Already joined this tournament', 400);
      }
      throw createError('Failed to join tournament', 500);
    }

    res.json({
      message: 'Joined tournament successfully',
      participant
    });
  } catch (error) {
    next(error);
  }
});

// Get tournament leaderboard
router.get('/:id/leaderboard', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const { data: leaderboard, error } = await supabase
      .from('tournament_results')
      .select(`
        *,
        user:custom_users(id, first_name, last_name, email)
      `)
      .eq('tournament_id', id)
      .order('total_score', { ascending: false })
      .order('completion_time', { ascending: true });

    if (error) {
      throw createError('Failed to fetch leaderboard', 500);
    }

    res.json({
      leaderboard: leaderboard || [],
      total_participants: leaderboard?.length || 0
    });
  } catch (error) {
    next(error);
  }
});

// Get tournament tasks
router.get('/:id/tasks', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { difficulty, category } = req.query;

    let query = supabase
      .from('tournament_tasks')
      .select('*')
      .eq('tournament_id', id)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw createError('Failed to fetch tournament tasks', 500);
    }

    res.json({ tasks: tasks || [] });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Add task to tournament
router.post('/:id/tasks', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const taskData = req.body;
    const userId = req.user!.id;

    // Check if user is the tournament creator or admin
    const { data: tournament, error: checkError } = await supabase
      .from('tournaments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError || !tournament) {
      throw createError('Tournament not found', 404);
    }

    if (tournament.created_by !== userId && req.user!.role !== 'admin') {
      throw createError('Not authorized to add tasks to this tournament', 403);
    }

    const { data: task, error } = await supabase
      .from('tournament_tasks')
      .insert({
        ...taskData,
        tournament_id: id,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      throw createError('Failed to add task to tournament', 500);
    }

    res.status(201).json({
      message: 'Task added to tournament successfully',
      task
    });
  } catch (error) {
    next(error);
  }
});

// Get specific tournament task
router.get('/:id/tasks/:taskId', async (req: AuthRequest, res, next) => {
  try {
    const { id, taskId } = req.params;

    const { data: task, error } = await supabase
      .from('tournament_tasks')
      .select('*')
      .eq('tournament_id', id)
      .eq('id', taskId)
      .eq('is_active', true)
      .single();

    if (error || !task) {
      throw createError('Task not found', 404);
    }

    // Remove test cases from response (only for submission)
    const { test_cases, ...taskWithoutTests } = task;

    res.json({ task: taskWithoutTests });
  } catch (error) {
    next(error);
  }
});

export default router;