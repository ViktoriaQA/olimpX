import { Router } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Get students participating in tournaments (trainers and admins only)
router.get('/tournaments', requireRole(['trainer', 'admin']), async (req: AuthRequest, res, next) => {
  try {
    // Get all students who are participating in tournaments
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select(`
        user_id,
        joined_at,
        status,
        user:custom_users(id, first_name, last_name, email, nickname, role)
      `)
      .eq('user.role', 'student');

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      throw createError('Failed to fetch participants', 500);
    }

    // Group by student and calculate statistics
    const studentMap = new Map();

    participants?.forEach((participant: any) => {
      const userId = participant.user_id;
      const user = participant.user;

      if (!user) return;

      if (!studentMap.has(userId)) {
        studentMap.set(userId, {
          id: userId,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          nickname: user.nickname || '',
          tournaments: [],
          totalTournaments: 0,
          totalScore: 0,
          averageScore: 0,
          bestRank: undefined
        });
      }

      const student = studentMap.get(userId);
      student.totalTournaments++;
    });

    // Get tournament details for each student
    for (const [userId, student] of studentMap.entries()) {
      const { data: studentTournaments, error: tournamentError } = await supabase
        .from('tournament_participants')
        .select(`
          tournament_id,
          joined_at,
          status,
          tournament:tournaments(id, title, status)
        `)
        .eq('user_id', userId);

      if (!tournamentError && studentTournaments) {
        student.tournaments = studentTournaments.map((st: any) => ({
          id: st.tournament.id,
          title: st.tournament.title,
          status: st.tournament.status,
          joined_at: st.joined_at
        }));
      }
    }

    // Get tournament results for scoring data
    const studentIds = Array.from(studentMap.keys());
    if (studentIds.length > 0) {
      const { data: results, error: resultsError } = await supabase
        .from('tournament_results')
        .select('*')
        .in('user_id', studentIds)
        .order('total_score', { ascending: false });

      if (!resultsError && results) {
        results.forEach((result: any) => {
          const student = studentMap.get(result.user_id);
          if (student) {
            student.totalScore += result.total_score || 0;
            if (result.rank) {
              student.bestRank = student.bestRank ? Math.min(student.bestRank, result.rank) : result.rank;
            }
          }
        });
      }
    }

    // Calculate average scores
    studentMap.forEach(student => {
      student.averageScore = student.totalTournaments > 0 ? Math.round(student.totalScore / student.totalTournaments) : 0;
    });

    const students = Array.from(studentMap.values());

    res.json({
      students,
      totalStudents: students.length,
      totalParticipations: students.reduce((sum, s) => sum + s.totalTournaments, 0),
      totalPoints: students.reduce((sum, s) => sum + s.totalScore, 0)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
