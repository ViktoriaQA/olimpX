import { Router } from 'express';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
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

    // Show all examples without filtering by visibility
    const filteredTasks = (tasks || []).map(task => {
      let taskWithoutTests = { ...task };
      
      if (task.examples_with_visibility) {
        taskWithoutTests.examples_with_visibility = task.examples_with_visibility;
      }

      // Remove test cases and old examples field
      const { test_cases, examples, ...finalTask } = taskWithoutTests;
      return finalTask;
    });

    res.json({
      tasks: filteredTasks,
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

// Get user's progress on tasks
router.get('/progress', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { tournament_id } = req.query;

    console.log('📊 Fetching progress:', {
      userId,
      tournament_id,
      userRole: req.user?.role
    });

    let query;

    if (tournament_id) {
      // Get tournament progress - simplified query first
      console.log('🏆 Fetching tournament progress for tournament:', tournament_id);
      
      // First try simple query without join - use tournament_task_id to filter
      const simpleQuery = supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .not('tournament_task_id', 'is', null);
      
      const { data: simpleProgress, error: simpleError } = await simpleQuery;
      
      if (simpleError) {
        console.error('❌ Simple query error:', simpleError);
        // Return empty progress on error
        return res.json({
          progress: {
            total_solved: 0,
            total_attempted: 0,
            by_difficulty: { easy: 0, medium: 0, hard: 0 },
            recent_activity: []
          },
          detailed_progress: []
        });
      }
      
      console.log('📊 Simple progress data:', simpleProgress?.length || 0);
      
      // If we have data, try to get tournament task details
      let progress = simpleProgress;
      if (simpleProgress && simpleProgress.length > 0) {
        const taskIds = simpleProgress.map(p => p.tournament_task_id).filter(Boolean);
        
        if (taskIds.length > 0) {
          const { data: tasks, error: taskError } = await supabase
            .from('tournament_tasks')
            .select('id, title, difficulty, points')
            .in('id', taskIds);
            
          if (!taskError && tasks) {
            // Merge task data into progress
            progress = simpleProgress.map(p => ({
              ...p,
              tournament_task: tasks.find(t => t.id === p.tournament_task_id)
            }));
          }
        }
      }
      
      query = { data: progress, error: null };
    } else {
      // Get general progress
      console.log('📚 Fetching general progress');
      query = supabase
        .from('user_progress')
        .select(`
          *,
          task:tasks(id, title, difficulty, points)
        `)
        .eq('user_id', userId)
        .not('task_id', 'is', null);
    }

    console.log('🔍 Executing query...');
    
    let progress, error;
    
    if (tournament_id) {
      // Already handled above
      const result = query as { data: any[], error: any };
      progress = result.data;
      error = result.error;
    } else {
      // Handle general progress query
      const result = await query;
      progress = result.data;
      error = result.error;
    }

    console.log('📈 Query result:', {
      error,
      dataLength: progress?.length || 0,
      hasData: !!progress
    });

    if (error) {
      console.error('❌ Database error:', error);
      // Return empty progress on any error
      return res.json({
        progress: {
          total_solved: 0,
          total_attempted: 0,
          by_difficulty: { easy: 0, medium: 0, hard: 0 },
          recent_activity: []
        },
        detailed_progress: []
      });
    }

    console.log('✅ Progress data fetched:', {
      progressCount: progress?.length || 0,
      sample: progress?.slice(0, 2)
    });

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

// Get all test cases for task execution (including hidden ones)
router.get('/:id/test-cases', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { tournament_id } = req.query;
    const userId = req.user!.id;
    const userRole = req.user?.role;

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
      // Get regular task
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

    // Get all test cases (both visible and hidden for execution)
    const testCases = Array.isArray(task.test_cases) ? task.test_cases : [];
    
    // For students, only return visible test cases for display
    // But for execution, we need all test cases
    const executionTestCases = testCases.map((testCase: any, index: number) => ({
      id: String(testCase.id || index + 1),
      input: String(testCase.input || ''),
      expected_output: String(testCase.output || ''),
      visible: userRole === 'student' ? (testCase.visible !== false) : true
    }));

    res.json({
      success: true,
      test_cases: executionTestCases,
      total_count: executionTestCases.length
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

    // Show all examples without filtering by visibility
    let taskWithoutTests = { ...task };
    if (task.examples_with_visibility) {
      taskWithoutTests.examples_with_visibility = task.examples_with_visibility;
    }

    // Also remove old examples field for consistency
    const { test_cases, examples, ...finalTask } = taskWithoutTests;

    res.json({ task: finalTask });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Create task
router.post('/', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { tournament_id, examples_with_visibility, ...taskData } = req.body;
    const userId = req.user!.id;

    // Validate examples structure
    if (examples_with_visibility) {
      if (!Array.isArray(examples_with_visibility)) {
        throw createError('examples_with_visibility must be an array', 400);
      }
      if (examples_with_visibility.length > 5) {
        throw createError('Maximum 5 examples allowed', 400);
      }
      
      // Validate each example has required fields
      for (const example of examples_with_visibility) {
        if (!example.id || !example.hasOwnProperty('input') || !example.hasOwnProperty('output') || !example.hasOwnProperty('visible')) {
          throw createError('Each example must have id, input, output, and visible fields', 400);
        }
      }
    }

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
          examples_with_visibility,
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
          examples_with_visibility,
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
    const { tournament_id, examples_with_visibility, ...updates } = req.body;
    const userId = req.user!.id;

    // Validate examples structure if provided
    if (examples_with_visibility !== undefined) {
      if (!Array.isArray(examples_with_visibility)) {
        throw createError('examples_with_visibility must be an array', 400);
      }
      if (examples_with_visibility.length > 5) {
        throw createError('Maximum 5 examples allowed', 400);
      }
      
      // Validate each example has required fields
      for (const example of examples_with_visibility) {
        if (!example.id || !example.hasOwnProperty('input') || !example.hasOwnProperty('output') || !example.hasOwnProperty('visible')) {
          throw createError('Each example must have id, input, output, and visible fields', 400);
        }
      }
    }

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
      const updateData = examples_with_visibility !== undefined 
        ? { ...updates, examples_with_visibility }
        : updates;
        
      const result = await supabase
        .from('tournament_tasks')
        .update(updateData)
        .eq('id', id)
        .eq('tournament_id', tournament_id)
        .select()
        .single();
      
      task = result.data;
      error = result.error;
    } else {
      // Update general task
      const updateData = examples_with_visibility !== undefined 
        ? { ...updates, examples_with_visibility }
        : updates;
        
      const result = await supabase
        .from('tasks')
        .update(updateData)
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
    const { code, language, tournament_id, test_results, score } = req.body;
    const userId = req.user!.id;

    console.log('📝 Submitting solution:', {
      taskId: id,
      userId,
      language,
      tournamentId: tournament_id,
      score,
      testResultsProvided: !!test_results,
      testCasesCount: test_results?.test_cases?.length
    });

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
    const submissionData = {
      task_id: id,
      user_id: userId,
      tournament_id: tournament_id || null,
      code,
      language,
      status: test_results ? (test_results.failed_tests === 0 ? 'passed' : 'failed') : 'pending',
      test_results: test_results || null,
      score: score || 0,
      execution_time_ms: test_results?.total_time || null,
      memory_used_mb: null,
      evaluated_at: test_results ? new Date().toISOString() : null
    };

    console.log('💾 Creating submission:', {
      ...submissionData,
      codeLength: code?.length,
      status: submissionData.status
    });

    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .insert(submissionData)
      .select()
      .single();

    if (submissionError) {
      console.error('❌ Failed to create submission:', submissionError);
      throw createError('Failed to create submission', 500);
    }

    console.log('✅ Submission created:', submission.id);

    // Update user progress
    const progressData = {
      user_id: userId,
      task_id: tournament_id ? null : id,
      tournament_task_id: tournament_id ? id : null,
      status: test_results ? (test_results.failed_tests === 0 ? 'completed' : 'in_progress') : 'in_progress',
      attempts: 1, // This should be incremented in a real implementation
      best_score: score || 0,
      completed_at: test_results && test_results.failed_tests === 0 ? new Date().toISOString() : null
    };

    console.log('📈 Updating user progress:', progressData);

    // Upsert progress
    const { error: progressError } = await supabase
      .from('user_progress')
      .upsert(progressData, {
        onConflict: tournament_id ? 'user_id,tournament_task_id' : 'user_id,task_id'
      });

    if (progressError) {
      console.error('❌ Failed to update progress:', progressError);
    } else {
      console.log('✅ User progress updated');
    }

    console.log('🎯 Submission complete! Final score:', score);

    res.json({
      success: true,
      message: 'Solution submitted successfully',
      submission: {
        ...submission,
        status: submission.status
      },
      score: score || 0
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