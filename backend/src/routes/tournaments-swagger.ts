import { Router } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /api/tournaments:
 *   get:
 *     tags: [Tournaments]
 *     summary: Get all tournaments
 *     description: Get a list of all tournaments with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, active, completed, cancelled]
 *         description: Filter by tournament status
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
 *         description: Number of tournaments per page
 *     responses:
 *       200:
 *         description: Tournaments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch tournaments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tournaments')
      .select(`
        *,
        creator:custom_users(id, nickname, email),
        participants:tournament_participants(count),
        tasks:tournaments_tasks(count)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('start_time', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tournaments, error, count } = await query;

    if (error) {
      throw createError('Failed to fetch tournaments', 500);
    }

    res.json({
      tournaments,
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
 * /api/tournaments/{id}:
 *   get:
 *     tags: [Tournaments]
 *     summary: Get tournament details
 *     description: Get detailed information about a specific tournament
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tournament ID
 *     responses:
 *       200:
 *         description: Tournament details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tournament:
 *                   $ref: '#/components/schemas/Tournament'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tournament not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch tournament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        creator:custom_users(id, nickname, email),
        participants:tournament_participants(
          id, user_id, joined_at,
          user:custom_users(id, nickname, avatar_url)
        ),
        tasks:tournaments_tasks(
          id, task_id, order_index,
          tasks:tasks(id, title, description, difficulty, points)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !tournament) {
      throw createError('Tournament not found', 404);
    }

    // Check if current user is a participant
    if (userId) {
      const { data: participation } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', id)
        .eq('user_id', userId)
        .single();

      tournament.is_participant = !!participation;
    }

    res.json({ tournament });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tournaments:
 *   post:
 *     tags: [Tournaments]
 *     summary: Create tournament (Trainer/Admin only)
 *     description: Create a new tournament
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - start_time
 *               - end_time
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tournament title
 *               description:
 *                 type: string
 *                 description: Tournament description
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: Tournament start time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 description: Tournament end time
 *               max_participants:
 *                 type: integer
 *                 description: Maximum number of participants
 *               prize_pool:
 *                 type: number
 *                 format: float
 *                 description: Prize pool amount
 *               registration_deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Registration deadline
 *     responses:
 *       201:
 *         description: Tournament created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tournament:
 *                   $ref: '#/components/schemas/Tournament'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Trainer/Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to create tournament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      description,
      start_time,
      end_time,
      max_participants,
      prize_pool,
      registration_deadline
    } = req.body;

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        title,
        description,
        creator_id: userId,
        start_time,
        end_time,
        max_participants,
        prize_pool,
        registration_deadline: registration_deadline || start_time,
        status: 'upcoming'
      })
      .select()
      .single();

    if (error) {
      throw createError('Failed to create tournament', 500);
    }

    res.status(201).json({ tournament });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tournaments/{id}:
 *   put:
 *     tags: [Tournaments]
 *     summary: Update tournament (Trainer/Admin only)
 *     description: Update an existing tournament
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tournament ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tournament title
 *               description:
 *                 type: string
 *                 description: Tournament description
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: Tournament start time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 description: Tournament end time
 *               max_participants:
 *                 type: integer
 *                 description: Maximum number of participants
 *               prize_pool:
 *                 type: number
 *                 format: float
 *                 description: Prize pool amount
 *               status:
 *                 type: string
 *                 enum: [upcoming, active, completed, cancelled]
 *                 description: Tournament status
 *     responses:
 *       200:
 *         description: Tournament updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tournament:
 *                   $ref: '#/components/schemas/Tournament'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Trainer/Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tournament not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to update tournament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !tournament) {
      throw createError('Tournament not found or update failed', 404);
    }

    res.json({ tournament });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tournaments/{id}/join:
 *   post:
 *     tags: [Tournaments]
 *     summary: Join tournament
 *     description: Join a tournament as a participant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tournament ID
 *     responses:
 *       200:
 *         description: Successfully joined tournament
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 participation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Participation ID
 *                     tournament_id:
 *                       type: string
 *                       description: Tournament ID
 *                     user_id:
 *                       type: string
 *                       description: User ID
 *                     joined_at:
 *                       type: string
 *                       format: date-time
 *                       description: Join timestamp
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tournament not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Cannot join tournament (full, expired, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to join tournament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/join', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if tournament exists and is joinable
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      throw createError('Tournament not found', 404);
    }

    if (tournament.status !== 'upcoming') {
      throw createError('Tournament is not accepting participants', 400);
    }

    if (tournament.max_participants) {
      const { count: participantCount } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', id);

      if ((participantCount || 0) >= tournament.max_participants) {
        throw createError('Tournament is full', 400);
      }
    }

    // Check if already joined
    const { data: existingParticipation } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', id)
      .eq('user_id', userId)
      .single();

    if (existingParticipation) {
      throw createError('Already joined this tournament', 400);
    }

    // Join tournament
    const { data: participation, error } = await supabase
      .from('tournament_participants')
      .insert({
        tournament_id: id,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      throw createError('Failed to join tournament', 500);
    }

    res.json({
      message: 'Successfully joined tournament',
      participation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tournaments/{id}/leaderboard:
 *   get:
 *     tags: [Tournaments]
 *     summary: Get tournament leaderboard
 *     description: Get the leaderboard for a specific tournament
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tournament ID
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
 *           default: 50
 *         description: Number of entries per page
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leaderboard:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rank:
 *                         type: integer
 *                         description: Current rank
 *                       user_id:
 *                         type: string
 *                         description: User ID
 *                       nickname:
 *                         type: string
 *                         description: User nickname
 *                       avatar_url:
 *                         type: string
 *                         format: uri
 *                         description: Avatar URL
 *                       total_score:
 *                         type: number
 *                         format: float
 *                         description: Total score
 *                       tasks_completed:
 *                         type: integer
 *                         description: Number of tasks completed
 *                       time_taken:
 *                         type: number
 *                         format: float
 *                         description: Time taken in seconds
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tournament not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch leaderboard
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/leaderboard', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get tournament results
    const { data: results, error, count } = await supabase
      .from('tournament_results')
      .select(`
        *,
        user:custom_users(id, nickname, avatar_url)
      `, { count: 'exact' })
      .eq('tournament_id', id)
      .order('total_score', { ascending: false })
      .order('updated_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw createError('Failed to fetch leaderboard', 500);
    }

    const leaderboard = results?.map((result, index) => ({
      rank: offset + index + 1,
      user_id: result.user_id,
      nickname: result.user?.nickname || 'Anonymous',
      avatar_url: result.user?.avatar_url,
      total_score: result.total_score,
      tasks_completed: result.tasks_completed,
      time_taken: result.time_taken
    })) || [];

    res.json({
      leaderboard,
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

export default router;
