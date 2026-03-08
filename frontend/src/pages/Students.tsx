import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Target, TrendingUp, Mail, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  nickname?: string;
  tournaments: Tournament[];
  totalTournaments: number;
  totalScore: number;
  averageScore: number;
  bestRank?: number;
}

interface Tournament {
  id: string;
  title: string;
  status: string;
  joined_at: string;
  rank?: number;
  total_score?: number;
}

const Students = () => {
  const { t } = useTranslation();
  const { user, role, token } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use backend API to get students in tournaments
      const response = await fetch('/api/students/tournaments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(t('students.fetchError', 'Failed to fetch students'));
    } finally {
      setLoading(false);
    }
  };

  if (role !== 'trainer' && role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            {t('students.accessDenied', 'Access Denied')}
          </h2>
          <p className="text-muted-foreground">
            {t('students.trainerOnlyAccess', 'Only trainers and administrators can view students.')}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse-glow text-primary font-mono">{t('students.loading', 'Loading students...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-destructive mb-4">{error}</div>
          <button
            onClick={fetchStudents}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {t('students.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            {t('students.noStudents', 'No Students Found')}
          </h2>
          <p className="text-muted-foreground">
            {t('students.noStudentsDescription', 'No students are currently participating in tournaments.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold font-mono text-primary neon-text">
          &gt; {t('students.title', 'Students in Tournaments')}_
        </h1>
        <p className="text-sm text-muted-foreground font-mono">
          {t('students.description', 'View all students participating in tournaments and their performance')}
        </p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="student-card border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold font-mono text-primary">{students.length}</p>
                <p className="text-xs text-muted-foreground font-mono">{t('students.totalStudents', 'Total Students')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="student-card border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-accent" />
              <div>
                <p className="text-2xl font-bold font-mono text-accent">
                  {students.reduce((sum, s) => sum + s.totalTournaments, 0)}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{t('students.totalParticipations', 'Total Participations')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="student-card border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-neon-cyan" />
              <div>
                <p className="text-2xl font-bold font-mono text-neon-cyan">
                  {students.reduce((sum, s) => sum + s.totalScore, 0)}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{t('students.totalPoints', 'Total Points')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="student-card border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-neon-green" />
              <div>
                <p className="text-2xl font-bold font-mono text-neon-green">
                  {Math.round(students.reduce((sum, s) => sum + s.averageScore, 0) / students.length)}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{t('students.averageScore', 'Average Score')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {students.map((student) => (
          <Card key={student.id} className="student-card border-border bg-card hover:neon-border transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="font-mono text-sm text-card-foreground">
                    {student.nickname || `${student.first_name} ${student.last_name}`.trim() || student.email}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {student.email}
                  </div>
                </div>
                {student.bestRank && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    #{student.bestRank}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground font-mono">{t('students.tournaments', 'Tournaments')}</p>
                  <p className="text-primary font-bold font-mono">{student.totalTournaments}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-mono">{t('students.totalScore', 'Total Score')}</p>
                  <p className="text-accent font-bold font-mono">{student.totalScore}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-mono">{t('students.averageScore', 'Average')}</p>
                  <p className="text-neon-cyan font-bold font-mono">{student.averageScore}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-mono">{t('students.bestRank', 'Best Rank')}</p>
                  <p className="text-neon-green font-bold font-mono">
                    {student.bestRank ? `#${student.bestRank}` : '-'}
                  </p>
                </div>
              </div>

              {student.tournaments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-mono">{t('students.recentTournaments', 'Recent Tournaments')}</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {student.tournaments.slice(0, 3).map((tournament) => (
                      <div key={tournament.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-card-foreground truncate flex-1">
                          {tournament.title}
                        </span>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge 
                            variant={tournament.status === 'completed' ? 'default' : 'secondary'} 
                            className="font-mono text-xs scale-75"
                          >
                            {t(`tournaments.status.${tournament.status}`, tournament.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {student.tournaments.length > 3 && (
                      <p className="text-xs text-muted-foreground font-mono">
                        +{student.tournaments.length - 3} {t('students.more', 'more')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Students;
