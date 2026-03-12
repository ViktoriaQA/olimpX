import { Router } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks
 *     description: Get a list of all tasks with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *         description: Filter by difficulty level
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by programming language
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
 *         description: Number of tasks per page
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch tasks
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { difficulty, category, language } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tasks')
      .select(`
        *,
        creator:custom_users(id, nickname),
        submissions:task_submissions(count),
        average_score:task_submissions(score)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (language) {
      query = query.contains('languages', [language]);
    }

    const { data: tasks, error, count } = await query;

    if (error) {
      throw createError('Failed to fetch tasks', 500);
    }

    res.json({
      tasks,
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
 * /api/tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task details
 *     description: Get detailed information about a specific task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        creator:custom_users(id, nickname),
        test_cases(
          id, input, expected_output, visible, explanation
        )
      `)
      .eq('id', id)
      .single();

    if (error || !task) {
      throw createError('Task not found', 404);
    }

    // Get user's submission history for this task
    if (userId) {
      const { data: submissions } = await supabase
        .from('task_submissions')
        .select('id, status, score, submitted_at, language')
        .eq('task_id', id)
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(5);

      task.user_submissions = submissions || [];
    }

    // Hide test cases for students
    if (req.user?.role === 'student') {
      task.test_cases = task.test_cases?.map((tc: any) => ({
        ...tc,
        input: tc.visible ? tc.input : null,
        expected_output: tc.visible ? tc.expected_output : null,
        explanation: tc.visible ? tc.explanation : null
      }));
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create task (Trainer/Admin only)
 *     description: Create a new programming task
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
 *               - difficulty
 *               - category
 *               - time_limit
 *               - memory_limit
 *               - points
 *               - languages
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Task description
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 description: Task difficulty
 *               category:
 *                 type: string
 *                 description: Task category
 *               time_limit:
 *                 type: integer
 *                 description: Time limit in seconds
 *               memory_limit:
 *                 type: integer
 *                 description: Memory limit in bytes
 *               points:
 *                 type: integer
 *                 description: Points awarded for completion
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Supported programming languages
 *               starter_code:
 *                 type: object
 *                 description: Starter code for each language
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Trainer/Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to create task
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
      difficulty,
      category,
      time_limit,
      memory_limit,
      points,
      languages,
      starter_code
    } = req.body;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        creator_id: userId,
        difficulty,
        category,
        time_limit,
        memory_limit,
        points,
        languages,
        starter_code: starter_code || {}
      })
      .select()
      .single();

    if (error) {
      throw createError('Failed to create task', 500);
    }

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update task (Trainer/Admin only)
 *     description: Update an existing task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Task description
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 description: Task difficulty
 *               category:
 *                 type: string
 *                 description: Task category
 *               time_limit:
 *                 type: integer
 *                 description: Time limit in seconds
 *               memory_limit:
 *                 type: integer
 *                 description: Memory limit in bytes
 *               points:
 *                 type: integer
 *                 description: Points awarded for completion
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Supported programming languages
 *               starter_code:
 *                 type: object
 *                 description: Starter code for each language
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Trainer/Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to update task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !task) {
      throw createError('Task not found or update failed', 404);
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tasks/{id}/submit:
 *   post:
 *     tags: [Tasks]
 *     summary: Submit solution
 *     description: Submit a solution for a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *               - code
 *             properties:
 *               language:
 *                 type: string
 *                 description: Programming language
 *               code:
 *                 type: string
 *                 description: Solution code
 *               tournament_id:
 *                 type: string
 *                 description: Tournament ID (if submitting for tournament)
 *     responses:
 *       200:
 *         description: Solution submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submission:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Submission ID
 *                     task_id:
 *                       type: string
 *                       description: Task ID
 *                     user_id:
 *                       type: string
 *                       description: User ID
 *                     language:
 *                       type: string
 *                       description: Programming language
 *                     status:
 *                       type: string
 *                       enum: [pending, running, passed, failed, error]
 *                       description: Submission status
 *                     score:
 *                       type: number
 *                       format: float
 *                       description: Score achieved
 *                     submitted_at:
 *                       type: string
 *                       format: date-time
 *                       description: Submission timestamp
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       test_case_id:
 *                         type: string
 *                         description: Test case ID
 *                       passed:
 *                         type: boolean
 *                         description: Whether test passed
 *                       actual_output:
 *                         type: string
 *                         description: Actual output
 *                       expected_output:
 *                         type: string
 *                         description: Expected output
 *                       execution_time:
 *                         type: number
 *                         description: Execution time
 *                       memory_used:
 *                         type: integer
 *                         description: Memory used
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to submit solution
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/submit', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { language, code, tournament_id } = req.body;

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      throw createError('Task not found', 404);
    }

    // Create submission record
    const { data: submission, error } = await supabase
      .from('task_submissions')
      .insert({
        task_id: id,
        user_id: userId,
        language,
        code,
        tournament_id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw createError('Failed to create submission', 500);
    }

    // TODO: Execute code against test cases asynchronously
    // This would typically be handled by a background job

    res.json({
      submission,
      results: [] // Will be populated after execution
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tasks/{id}/submissions:
 *   get:
 *     tags: [Tasks]
 *     summary: Get user's submissions for task
 *     description: Get the current user's submission history for a specific task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
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
 *           maximum: 50
 *           default: 20
 *         description: Number of submissions per page
 *     responses:
 *       200:
 *         description: Submissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Submission ID
 *                       task_id:
 *                         type: string
 *                         description: Task ID
 *                       language:
 *                         type: string
 *                         description: Programming language
 *                       status:
 *                         type: string
 *                         enum: [pending, running, passed, failed, error]
 *                         description: Submission status
 *                       score:
 *                         type: number
 *                         format: float
 *                         description: Score achieved
 *                       submitted_at:
 *                         type: string
 *                         format: date-time
 *                         description: Submission timestamp
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
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch submissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/submissions', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: submissions, error, count } = await supabase
      .from('task_submissions')
      .select('*', { count: 'exact' })
      .eq('task_id', id)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw createError('Failed to fetch submissions', 500);
    }

    res.json({
      submissions,
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
 * /api/tasks/progress:
 *   get:
 *     tags: [Tasks]
 *     summary: Get user's task progress
 *     description: Get the current user's progress across all tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_tasks:
 *                   type: integer
 *                   description: Total number of tasks
 *                 completed_tasks:
 *                   type: integer
 *                   description: Number of completed tasks
 *                 in_progress_tasks:
 *                   type: integer
 *                   description: Number of in-progress tasks
 *                 average_score:
 *                   type: number
 *                   format: float
 *                   description: Average score across all submissions
 *                 difficulty_breakdown:
 *                   type: object
 *                   properties:
 *                     easy:
 *                       type: object
 *                       properties:
 *                         completed:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                     medium:
 *                       type: object
 *                       properties:
 *                         completed:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                     hard:
 *                       type: object
 *                       properties:
 *                         completed:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                 recent_submissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       task_id:
 *                         type: string
 *                       task_title:
 *                         type: string
 *                       score:
 *                         type: number
 *                         format: float
 *                       submitted_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch progress
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/progress', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    // Get task statistics
    const { data: taskStats } = await supabase
      .from('tasks')
      .select('id, difficulty');

    const totalTasks = taskStats?.length || 0;

    // Get submission statistics
    const { data: submissions } = await supabase
      .from('task_submissions')
      .select(`
        task_id,
        status,
        score,
        submitted_at,
        tasks!inner(title, difficulty)
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    // Calculate progress metrics
    const completedTasks = new Set(
      submissions?.filter(s => s.status === 'passed').map(s => s.task_id) || []
    ).size;

    const inProgressTasks = new Set(
      submissions?.filter(s => s.status !== 'passed').map(s => s.task_id) || []
    ).size;

    const averageScore = submissions && submissions.length > 0 
      ? submissions.reduce((acc, s) => acc + (s.score || 0), 0) / submissions.length 
      : 0;

    // Difficulty breakdown
    const difficultyBreakdown = {
      easy: { completed: 0, total: 0 },
      medium: { completed: 0, total: 0 },
      hard: { completed: 0, total: 0 }
    };

    taskStats?.forEach(task => {
      if (difficultyBreakdown[task.difficulty as keyof typeof difficultyBreakdown]) {
        difficultyBreakdown[task.difficulty as keyof typeof difficultyBreakdown].total++;
      }
    });

    submissions?.forEach((submission: any) => {
      const difficulty = submission.tasks?.difficulty;
      if (difficulty && submission.status === 'passed') {
        if (difficultyBreakdown[difficulty as keyof typeof difficultyBreakdown]) {
          difficultyBreakdown[difficulty as keyof typeof difficultyBreakdown].completed++;
        }
      }
    });

    // Recent submissions
    const recentSubmissions = submissions?.slice(0, 10).map((s: any) => ({
      task_id: s.task_id,
      task_title: s.tasks?.title || 'Unknown Task',
      score: s.score,
      submitted_at: s.submitted_at
    })) || [];

    res.json({
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      in_progress_tasks: inProgressTasks,
      average_score: averageScore,
      difficulty_breakdown: difficultyBreakdown,
      recent_submissions: recentSubmissions
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tasks/{id}/stats:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task statistics (Trainer/Admin only)
 *     description: Get detailed statistics for a specific task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     total_submissions:
 *                       type: integer
 *                       description: Total number of submissions
 *                     unique_users:
 *                       type: integer
 *                       description: Number of unique users who attempted
 *                     success_rate:
 *                       type: number
 *                       format: float
 *                       description: Success rate percentage
 *                     average_score:
 *                       type: number
 *                       format: float
 *                       description: Average score
 *                     language_breakdown:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                       description: Number of submissions by language
 *                     difficulty_rating:
 *                       type: number
 *                       format: float
 *                       description: Average user difficulty rating
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Trainer/Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/stats', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      throw createError('Task not found', 404);
    }

    // Get submission statistics
    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('user_id, status, score, language')
      .eq('task_id', id);

    const totalSubmissions = submissions?.length || 0;
    const uniqueUsers = new Set(submissions?.map(s => s.user_id) || []).size;
    const successfulSubmissions = submissions?.filter(s => s.status === 'passed').length || 0;
    const successRate = totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions) * 100 : 0;
    const averageScore = totalSubmissions > 0 
      ? submissions!.reduce((acc, s) => acc + (s.score || 0), 0) / totalSubmissions 
      : 0;

    // Language breakdown
    const languageBreakdown: Record<string, number> = {};
    submissions?.forEach(s => {
      languageBreakdown[s.language] = (languageBreakdown[s.language] || 0) + 1;
    });

    res.json({
      task,
      statistics: {
        total_submissions: totalSubmissions,
        unique_users: uniqueUsers,
        success_rate: successRate,
        average_score: averageScore,
        language_breakdown: languageBreakdown,
        difficulty_rating: 0 // TODO: Implement user ratings
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
