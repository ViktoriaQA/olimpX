import { Router } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Helper function to get current participant count
const getCurrentParticipantCount = async (tournamentId: string) => {
  const { count } = await supabase
    .from('tournament_participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);
  return count || 0;
};

// Helper function to update participant count
const updateParticipantCount = async (tournamentId: string, currentCount: number, targetCount: number) => {
  if (targetCount > currentCount) {
    // Add dummy participants to reach target count
    const participantsToAdd = targetCount - currentCount;
    const dummyParticipants = [];
    
    for (let i = 0; i < participantsToAdd; i++) {
      dummyParticipants.push({
        tournament_id: tournamentId,
        user_id: `00000000-0000-0000-0000-00000000000${i}`, // Dummy user ID
        status: 'registered'
      });
    }
    
    await supabase
      .from('tournament_participants')
      .insert(dummyParticipants);
  } else if (targetCount < currentCount) {
    // Remove excess participants
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .limit(currentCount - targetCount);
    
    if (participants && participants.length > 0) {
      const participantIds = participants.map(p => p.id);
      await supabase
        .from('tournament_participants')
        .delete()
        .in('id', participantIds);
    }
  }
};

// Get all tournaments (both authenticated and public)
router.get('/', async (req: AuthRequest | any, res, next) => {
  try {
    const { status, page = 1, limit = 20, is_active } = req.query;
    const isPublicRoute = req.originalUrl?.includes('/api/public/tournaments');
    
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

    // For public route, only return tournaments marked for public display
    if (isPublicRoute) {
      query = query.eq('show_on_public_page', true);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // For authenticated students, get both public tournaments and their trainer's tournaments
    if (!isPublicRoute && req.user && req.user.role === 'student') {
      // First get public tournaments that are also marked for public page display
      const { data: publicTournaments, error: publicError } = await query.eq('is_public', true).eq('show_on_public_page', true);
      
      if (publicError) {
        throw createError('Failed to fetch public tournaments', 500);
      }

      // Then get tournaments where student is participating
      const { data: participatingTournaments, error: participatingError } = await supabase
        .from('tournament_participants')
        .select(`
          tournament:tournaments(
            *,
            creator:created_by(id, first_name, last_name, email),
            _count:tournament_participants(count)
          )
        `)
        .eq('user_id', req.user.id);

      if (participatingError) {
        throw createError('Failed to fetch participating tournaments', 500);
      }

      // Get student's trainer (if any)
      const { data: studentProfile } = await supabase
        .from('custom_users')
        .select('trainer_id')
        .eq('id', req.user.id)
        .single();

      let trainerTournaments: any[] = [];
      if (studentProfile?.trainer_id) {
        // Get tournaments created by student's trainer that are visible to trainer's students
        const { data: trainerVisibleTournaments, error: trainerError } = await supabase
          .from('tournaments')
          .select(`
            *,
            creator:created_by(id, first_name, last_name, email),
            _count:tournament_participants(count)
          `)
          .eq('created_by', studentProfile.trainer_id)
          .eq('is_public', true); // Visible to trainer's students

        if (!trainerError && trainerVisibleTournaments) {
          trainerTournaments = trainerVisibleTournaments;
        }
      }

      // Combine and deduplicate
      const allTournaments = [...(publicTournaments || []), ...(participatingTournaments?.map(p => p.tournament) || []), ...trainerTournaments];
      const uniqueTournaments = allTournaments.reduce((acc: any[], current) => {
        if (!acc.find(t => t.id === current.id)) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Map database fields to frontend format
      const mappedTournaments = uniqueTournaments.map(tournament => ({
        ...tournament,
        name: tournament.title, // database 'title' -> frontend 'name'
        is_active: tournament.is_public, // database 'is_public' -> frontend 'is_active'
        prize: tournament.rules, // database 'rules' -> frontend 'prize'
        // Remove database-specific fields
        title: undefined,
        is_public: undefined,
        rules: undefined
      }));

      res.json({
        tournaments: mappedTournaments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: mappedTournaments.length
        }
      });
      return;
    } else if (!isPublicRoute && is_active !== undefined) {
      query = query.eq('is_public', is_active === 'true');
    }

    const { data: tournaments, error } = await query;

    if (error) {
      throw createError('Failed to fetch tournaments', 500);
    }

    // Map database fields to frontend format
    const mappedTournaments = tournaments?.map(tournament => ({
      ...tournament,
      name: tournament.title, // database 'title' -> frontend 'name'
      is_active: tournament.is_public, // database 'is_public' -> frontend 'is_active'
      prize: tournament.rules, // database 'rules' -> frontend 'prize'
      // Remove database-specific fields
      title: undefined,
      is_public: undefined,
      rules: undefined
    })) || [];

    res.json({
      tournaments: mappedTournaments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: mappedTournaments.length
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

    let query = supabase
      .from('tournaments')
      .select(`
        *,
        creator:created_by(id, first_name, last_name, email),
        tasks:tournament_tasks(*),
        participants:tournament_participants(
          joined_at,
          status,
          user:custom_users(id, first_name, last_name, email, role)
        ),
        _count:tournament_participants(count)
      `)
      .eq('id', id);

    // Students can see public tournaments OR tournaments they are participating in
    if (req.user!.role === 'student') {
      // Check if tournament is public or if student is participating
      const { data: participation, error: participationError } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', id)
        .eq('user_id', req.user!.id)
        .single();

      if (participationError && participationError.code !== 'PGRST116') {
        // Error other than "not found"
        throw createError('Failed to check tournament participation', 500);
      }

      // If tournament is not public and student is not participating, deny access
      if (!participation) {
        query = query.eq('is_public', true);
      }
    }

    const { data: tournament, error } = await query.single();

    if (error || !tournament) {
      throw createError('Tournament not found', 404);
    }

    // Map database fields to frontend format
    const mappedTournament = {
      ...tournament,
      name: tournament.title, // database 'title' -> frontend 'name'
      is_active: tournament.is_public, // database 'is_public' -> frontend 'is_active'
      prize: tournament.rules, // database 'rules' -> frontend 'prize'
      // Remove database-specific fields
      title: undefined,
      is_public: undefined,
      rules: undefined
    };

    res.json({ tournament: mappedTournament });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Create tournament
router.post('/', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const tournamentData = req.body;
    const userId = req.user!.id;

    // Map frontend fields to database fields
    const dbTournamentData = {
      title: tournamentData.name, // frontend 'name' -> database 'title'
      description: tournamentData.description,
      status: tournamentData.status,
      max_participants: tournamentData.max_participants,
      is_public: tournamentData.is_active, // frontend 'is_active' -> database 'is_public'
      show_on_public_page: tournamentData.show_on_public_page || false,
      entry_fee: 0,
      prize_pool: tournamentData.prize ? 0 : null, // Convert prize to prize_pool if needed
      rules: tournamentData.prize || null, // Store prize in rules field for now
      start_time: new Date().toISOString(), // Default to current time since dates were removed
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 7 days from now
      created_by: userId
    };

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert(dbTournamentData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating tournament:', error);
      throw createError(`Failed to create tournament: ${error.message}`, 500);
    }

    res.status(201).json({
      message: 'Tournament created successfully',
      tournament
    });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Update tournament (Basic or Premium subscription required)
router.put('/:id', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user!.id;

    // Check if tournament exists
    const { data: existing, error: checkError } = await supabase
      .from('tournaments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      throw createError('Tournament not found', 404);
    }

    // Check if user is the creator or admin
    if (existing.created_by !== userId && req.user!.role !== 'admin') {
      throw createError('Not authorized to update this tournament', 403);
    }

    // Check if user has Basic or Premium subscription (except for admins)
    if (req.user!.role !== 'admin') {
      const { data: userProfile } = await supabase
        .from('custom_users')
        .select('subscription_plan')
        .eq('id', userId)
        .single();

      if (!userProfile?.subscription_plan || (userProfile.subscription_plan !== 'Basic' && userProfile.subscription_plan !== 'Pro')) {
        throw createError('Basic or Premium subscription required to edit tournaments', 403);
      }
    }

    // Map frontend fields to database fields
    const dbUpdates = {
      title: updates.name, // frontend 'name' -> database 'title'
      description: updates.description,
      status: updates.status,
      max_participants: updates.max_participants,
      is_public: updates.is_active, // frontend 'is_active' -> database 'is_public'
      show_on_public_page: updates.show_on_public_page || false,
      rules: updates.prize || null, // Store prize in rules field for now
      prize_pool: updates.min_participants || null, // Temporarily store min_participants in prize_pool
      updated_at: new Date().toISOString()
    };

    // Handle current_participants update if provided
    if (updates.current_participants !== undefined) {
      // Update tournament participants count by adding/removing participants as needed
      const currentCount = await getCurrentParticipantCount(id);
      const targetCount = updates.current_participants;
      
      if (targetCount !== currentCount) {
        await updateParticipantCount(id, currentCount, targetCount);
      }
    }

    // Remove undefined fields
    Object.keys(dbUpdates).forEach((key: string) => {
      if (dbUpdates[key as keyof typeof dbUpdates] === undefined) {
        delete dbUpdates[key as keyof typeof dbUpdates];
      }
    });

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating tournament:', error);
      throw createError(`Failed to update tournament: ${error.message}`, 500);
    }

    // Map database fields back to frontend format for response
    const finalParticipantCount = updates.current_participants !== undefined 
      ? updates.current_participants 
      : await getCurrentParticipantCount(id);
      
    const mappedTournament = {
      ...tournament,
      name: tournament.title, // database 'title' -> frontend 'name'
      is_active: tournament.is_public, // database 'is_public' -> frontend 'is_active'
      prize: tournament.rules, // database 'rules' -> frontend 'prize'
      maxParticipants: tournament.max_participants || 50,
      minParticipants: tournament.prize_pool || updates.min_participants || 0, // Get from prize_pool or form
      participants: finalParticipantCount, // Use target count
      startDate: tournament.start_time,
      endDate: tournament.end_time,
      difficulty: tournament.difficulty || 'medium',
      // Remove database-specific fields
      title: undefined,
      is_public: undefined,
      rules: undefined,
      prize_pool: undefined // Hide internal field
    };

    res.json({
      message: 'Tournament updated successfully',
      tournament: mappedTournament
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

    // Check if user is a student or trainer (allow both to join)
    if (req.user!.role !== 'student' && req.user!.role !== 'trainer') {
      throw createError('Only students and trainers can join tournaments', 403);
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

// Leave tournament (students only)
router.delete('/:id/leave', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user is a student or trainer (allow both to leave)
    if (req.user!.role !== 'student' && req.user!.role !== 'trainer') {
      throw createError('Only students and trainers can leave tournaments', 403);
    }

    // Remove participant
    const { error } = await supabase
      .from('tournament_participants')
      .delete()
      .eq('tournament_id', id)
      .eq('user_id', userId);

    if (error) {
      throw createError('Failed to leave tournament', 500);
    }

    res.json({
      message: 'Left tournament successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get user's tournament participation (including tournaments added by coach)
router.get('/my/participations', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    // Get tournaments user directly joined
    const { data: directParticipations, error: directError } = await supabase
      .from('tournament_participants')
      .select(`
        *,
        tournament:tournaments(
          *,
          creator:created_by(id, first_name, last_name, email),
          _count:tournament_participants(count)
        )
      `)
      .eq('user_id', userId);

    if (directError) {
      throw createError('Failed to fetch tournament participations', 500);
    }

    // For students, also get tournaments where they were added by a trainer
    let coachAddedParticipations: any[] = [];
    if (req.user!.role === 'student') {
      const { data: coachAdded, error: coachError } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          tournament:tournaments(
            *,
            creator:created_by(id, first_name, last_name, email),
            _count:tournament_participants(count)
          )
        `)
        .eq('user_id', userId);

      if (!coachError && coachAdded) {
        coachAddedParticipations = coachAdded;
      }
    }

    // Combine all participations
    const allParticipations = [...(directParticipations || []), ...coachAddedParticipations];
    
    // Remove duplicates by tournament ID
    const uniqueParticipations = allParticipations.reduce((acc: any[], current) => {
      const existing = acc.find(p => p.tournament.id === current.tournament.id);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Transform data to match frontend format
    const transformedParticipations = uniqueParticipations.map(p => ({
      ...p.tournament,
      isJoined: true,
      participants: p.tournament._count?.tournament_participants || 0,
      maxParticipants: p.tournament.max_participants || 50,
      startDate: p.tournament.start_time,
      endDate: p.tournament.end_time,
      difficulty: p.tournament.difficulty || 'medium',
      prize: p.tournament.rules,
      // Remove database-specific fields
      title: undefined,
      is_public: undefined,
      rules: undefined
    })) || [];

    res.json({
      tournaments: transformedParticipations
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
    const { task_id, ...taskData } = req.body;
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

    let task;

    if (task_id) {
      // Add existing task from library
      const { data: existingTask, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', task_id)
        .eq('is_public', true)
        .eq('is_active', true)
        .single();

      if (taskError || !existingTask) {
        console.error('Error fetching existing task:', taskError);
        throw createError('Task not found in library', 404);
      }

      console.log('Existing task data:', existingTask);

      // Add task to tournament
      const { data: tournamentTask, error: insertError } = await supabase
        .from('tournament_tasks')
        .insert({
          tournament_id: id,
          title: existingTask.title,
          description: existingTask.description,
          difficulty: existingTask.difficulty,
          category: existingTask.category,
          points: existingTask.points || 100,
          order_index: 0, // Required field
          is_active: true,
          created_by: userId,
          // Copy structured fields for proper task content
          problem_statement: existingTask.problem_statement,
          input_format: existingTask.input_format,
          output_format: existingTask.output_format,
          constraints: existingTask.constraints,
          examples: existingTask.examples,
          examples_with_visibility: existingTask.examples_with_visibility,
          time_limit_ms: existingTask.time_limit_ms,
          memory_limit_mb: existingTask.memory_limit_mb,
          test_cases: existingTask.test_cases,
          solution_template: existingTask.solution_template
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase error adding task to tournament:', insertError);
        throw createError(`Failed to add task to tournament: ${insertError.message}`, 500);
      }

      task = tournamentTask;
    } else {
      // Create new task directly in tournament (original functionality)
      const { data: newTask, error } = await supabase
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

      task = newTask;
    }

    res.status(201).json({
      message: 'Task added to tournament successfully',
      task
    });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Add student to tournament by email
router.post('/:id/add-student', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const userId = req.user!.id;

    if (!email) {
      throw createError('Email is required', 400);
    }

    // Check if user is tournament creator or admin
    const { data: tournament, error: checkError } = await supabase
      .from('tournaments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError || !tournament) {
      throw createError('Tournament not found', 404);
    }

    if (tournament.created_by !== userId && req.user!.role !== 'admin') {
      throw createError('Not authorized to add students to this tournament', 403);
    }

    // Find student by email
    const { data: student, error: studentError } = await supabase
      .from('custom_users')
      .select('id, email, first_name, last_name, role')
      .eq('email', email.toLowerCase())
      .single();

    if (studentError || !student) {
      throw createError('Student with this email not found', 404);
    }

    if (student.role !== 'student') {
      throw createError('User with this email is not a student', 400);
    }

    // Check if student is already in tournament
    const { data: existingParticipant } = await supabase
      .from('tournament_participants')
      .select('*')
      .eq('tournament_id', id)
      .eq('user_id', student.id)
      .single();

    if (existingParticipant) {
      throw createError('Student is already in this tournament', 400);
    }

    // Add student to tournament
    const { data: participant, error: addError } = await supabase
      .from('tournament_participants')
      .insert({
        tournament_id: id,
        user_id: student.id,
        status: 'registered'
      })
      .select(`
        *,
        user:custom_users(id, first_name, last_name, email)
      `)
      .single();

    if (addError) {
      throw createError('Failed to add student to tournament', 500);
    }

    res.status(201).json({
      message: 'Student added to tournament successfully',
      participant
    });
  } catch (error) {
    next(error);
  }
});

// Get tournament progress for all participants
router.get('/:id/progress', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Get tournament participants
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select(`
        user_id,
        user:custom_users(id, first_name, last_name, email, role)
      `)
      .eq('tournament_id', id);

    if (participantsError) {
      throw createError('Failed to fetch tournament participants', 500);
    }

    // Get tournament tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tournament_tasks')
      .select('id, title, points, difficulty')
      .eq('tournament_id', id)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (tasksError) {
      throw createError('Failed to fetch tournament tasks', 500);
    }

    // Get progress data for each participant
    const studentParticipants = participants?.filter((p: any) => p.user?.role === 'student') || [];
    
    const progressPromises = studentParticipants.map(async (participant: any) => {
      const userId = participant.user_id;
      
      // Get user progress for tournament tasks
      const { data: userProgress, error: progressError } = await supabase
        .from('user_progress')
        .select(`
          tournament_task_id,
          best_score,
          status,
          tournament_task:tournament_tasks(id, title, points)
        `)
        .eq('user_id', userId)
        .not('tournament_task_id', 'is', null);

      if (progressError) {
        console.error('Error fetching progress for user:', userId, progressError);
        return null;
      }

      // Get best scores from submissions as fallback
      const { data: submissions, error: submissionsError } = await supabase
        .from('task_submissions')
        .select('task_id, score')
        .eq('user_id', userId)
        .eq('tournament_id', id)
        .eq('status', 'passed');

      const submissionScores: Record<string, number> = {};
      if (!submissionsError && submissions) {
        (submissions as any[]).forEach((submission: any) => {
          const currentBest = submissionScores[submission.task_id] || 0;
          submissionScores[submission.task_id] = Math.max(currentBest, submission.score || 0);
        });
      }

      // Combine progress data
      const taskScores: Record<string, number> = {};
      let totalScore = 0;

      tasks?.forEach((task: any) => {
        // Try to get score from user_progress first
        const progressEntry = (userProgress as any[])?.find(p => p.tournament_task_id === task.id);
        let score = 0;

        if (progressEntry && (progressEntry.status === 'completed' || progressEntry.best_score > 0)) {
          score = progressEntry.best_score || 0;
        } else {
          // Fallback to submissions
          score = submissionScores[task.id] || 0;
        }

        taskScores[task.id] = score;
        totalScore += score;
      });

      return {
        userId: userId,
        userName: `${participant.user?.first_name || ''} ${participant.user?.last_name || ''}`.trim() || participant.user?.email || 'Unknown',
        userEmail: participant.user?.email || '',
        taskScores,
        totalScore
      };
    });

    const progressResults = await Promise.all(progressPromises);
    const progress = progressResults.filter(result => result !== null);

    res.json({
      progress,
      tasks: tasks || [],
      total_participants: studentParticipants.length
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

// Trainer/Admin: Delete task from tournament
router.delete('/:id/tasks/:taskId', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id, taskId } = req.params;
    const userId = req.user!.id;

    // Check if tournament exists and user is the creator
    const { data: tournament, error: checkError } = await supabase
      .from('tournaments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError || !tournament) {
      throw createError('Tournament not found', 404);
    }

    // Only tournament creator or admin can delete tasks
    if (tournament.created_by !== userId && req.user!.role !== 'admin') {
      throw createError('Not authorized to delete tasks from this tournament', 403);
    }

    // Check if task exists in this tournament
    const { data: task, error: taskError } = await supabase
      .from('tournament_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('tournament_id', id)
      .single();

    if (taskError || !task) {
      throw createError('Task not found in tournament', 404);
    }

    // Soft delete the task (set is_active to false)
    const { data: deletedTask, error: deleteError } = await supabase
      .from('tournament_tasks')
      .update({ is_active: false })
      .eq('id', taskId)
      .eq('tournament_id', id)
      .select()
      .single();

    if (deleteError) {
      console.error('Supabase error deleting task from tournament:', deleteError);
      throw createError('Failed to delete task from tournament', 500);
    }

    res.json({
      message: 'Task deleted from tournament successfully',
      task: deletedTask
    });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Reactivate task in tournament
router.patch('/:id/tasks/:taskId/reactivate', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id, taskId } = req.params;
    const userId = req.user!.id;

    // Check if tournament exists and user is the creator
    const { data: tournament, error: checkError } = await supabase
      .from('tournaments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError || !tournament) {
      throw createError('Tournament not found', 404);
    }

    // Only tournament creator or admin can reactivate tasks
    if (tournament.created_by !== userId && req.user!.role !== 'admin') {
      throw createError('Not authorized to reactivate tasks in this tournament', 403);
    }

    // Check if task exists in this tournament
    const { data: task, error: taskError } = await supabase
      .from('tournament_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('tournament_id', id)
      .single();

    if (taskError || !task) {
      throw createError('Task not found in tournament', 404);
    }

    // Reactivate the task (set is_active to true)
    const { data: reactivatedTask, error: reactivateError } = await supabase
      .from('tournament_tasks')
      .update({ is_active: true })
      .eq('id', taskId)
      .eq('tournament_id', id)
      .select()
      .single();

    if (reactivateError) {
      console.error('Supabase error reactivating task in tournament:', reactivateError);
      throw createError('Failed to reactivate task in tournament', 500);
    }

    res.json({
      message: 'Task reactivated in tournament successfully',
      task: reactivatedTask
    });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Delete tournament (only archived tournaments or by admin with Premium subscription)
router.delete('/:id', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if tournament exists
    const { data: existing, error: checkError } = await supabase
      .from('tournaments')
      .select('created_by, status, start_time, end_time')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      throw createError('Tournament not found', 404);
    }

    // Check if user is the creator or admin
    if (existing.created_by !== userId && req.user!.role !== 'admin') {
      throw createError('Not authorized to delete this tournament', 403);
    }

    // Check if user has Premium subscription (except for admins)
    if (req.user!.role !== 'admin') {
      const { data: userProfile } = await supabase
        .from('custom_users')
        .select('subscription_plan')
        .eq('id', userId)
        .single();

      if (userProfile?.subscription_plan !== 'Pro') {
        throw createError('Premium subscription required to delete tournaments', 403);
      }
    }

    // Allow deletion if:
    // 1. Tournament is archived, OR
    // 2. User is admin, OR  
    // 3. Tournament is not active yet (upcoming) and user is creator with Premium
    const now = new Date();
    const startTime = new Date(existing.start_time);
    const canDelete = 
      existing.status === 'archived' || 
      req.user!.role === 'admin' || 
      (existing.status === 'upcoming' && now < startTime);

    if (!canDelete) {
      throw createError('Cannot delete active or completed tournaments. Archive them first or contact admin.', 400);
    }

    // Delete tournament (cascade delete will handle related records)
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting tournament:', error);
      throw createError('Failed to delete tournament', 500);
    }

    res.json({
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Trainer/Admin: Archive tournament (Premium subscription required)
router.patch('/:id/archive', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if tournament exists
    const { data: existing, error: checkError } = await supabase
      .from('tournaments')
      .select('created_by, status')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      throw createError('Tournament not found', 404);
    }

    // Check if user is the creator or admin
    if (existing.created_by !== userId && req.user!.role !== 'admin') {
      throw createError('Not authorized to archive this tournament', 403);
    }

    // Check if user has Premium subscription (except for admins)
    if (req.user!.role !== 'admin') {
      const { data: userProfile } = await supabase
        .from('custom_users')
        .select('subscription_plan')
        .eq('id', userId)
        .single();

      if (userProfile?.subscription_plan !== 'Pro') {
        throw createError('Premium subscription required to archive tournaments', 403);
      }
    }

    // Don't allow archiving already archived tournaments
    if (existing.status === 'archived') {
      throw createError('Tournament is already archived', 400);
    }

    // Archive tournament
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error archiving tournament:', error);
      throw createError('Failed to archive tournament', 500);
    }

    // Map database fields back to frontend format for response
    const mappedTournament = {
      ...tournament,
      name: tournament.title, // database 'title' -> frontend 'name'
      is_active: tournament.is_public, // database 'is_public' -> frontend 'is_active'
      prize: tournament.rules, // database 'rules' -> frontend 'prize'
      // Remove database-specific fields
      title: undefined,
      is_public: undefined,
      rules: undefined
    };

    res.json({
      message: 'Tournament archived successfully',
      tournament: mappedTournament
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all tournaments (including private and archived)
router.get('/admin/all', requireRole(['admin']), async (req: AuthRequest, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    let query = supabase
      .from('tournaments')
      .select(`
        *,
        creator:created_by(id, first_name, last_name, email),
        _count:tournament_participants(count)
      `)
      .order('created_at', { ascending: false })
      .range(
        (Number(page) - 1) * Number(limit),
        Number(page) * Number(limit) - 1
      );

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: tournaments, error } = await query;

    if (error) {
      throw createError('Failed to fetch tournaments', 500);
    }

    // Map database fields to frontend format
    const mappedTournaments = await Promise.all(tournaments?.map(async (tournament) => {
      // Get min participants from prize_pool field (temporary storage)
      const minParticipants = tournament.prize_pool || 0;
      
      return {
        ...tournament,
        name: tournament.title, // database 'title' -> frontend 'name'
        is_active: tournament.is_public, // database 'is_public' -> frontend 'is_active'
        prize: tournament.rules, // database 'rules' -> frontend 'prize'
        maxParticipants: tournament.max_participants || 50,
        minParticipants: minParticipants, // Get from prize_pool
        participants: await getCurrentParticipantCount(tournament.id), // Get current participant count
        startDate: tournament.start_time,
        endDate: tournament.end_time,
        difficulty: tournament.difficulty || 'medium',
        // Remove database-specific fields
        title: undefined,
        is_public: undefined,
        rules: undefined,
        prize_pool: undefined // Hide internal field
      };
    }) || []);

    res.json({
      tournaments: mappedTournaments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: mappedTournaments.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;