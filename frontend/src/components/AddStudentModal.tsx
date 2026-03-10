import { useState, useEffect } from "react";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Search, Users, BookOpen, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Student {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  joined_at?: string;
  status?: string;
}

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  onSuccess: () => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({
  open,
  onOpenChange,
  tournamentId,
  onSuccess
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: t('common.error'),
        description: t('tournaments.emailRequired', 'Email є обов\'язковим'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error(t('auth.loginRequired'));
      }

      const response = await fetch(`/api/tournaments/${tournamentId}/add-student`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('tournaments.failedToAddStudent'));
      }

      const result = await response.json();
      
      toast({
        title: t('common.success'),
        description: t('tournaments.studentAddedSuccessfully', 'Студента успішно додано до турніру'),
      });

      setEmail("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding student:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('tournaments.failedToAddStudent'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const participants = data.tournament?.participants || [];
        const studentParticipants = participants.filter((p: any) => p.user?.role === 'student');
        setStudents(studentParticipants.map((p: any) => ({
          id: p.user.id,
          email: p.user.email,
          first_name: p.user.first_name,
          last_name: p.user.last_name,
          role: p.user.role,
          joined_at: p.joined_at,
          status: p.status
        })));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Fetch students when modal opens
  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            <UserPlus className="h-5 w-5" />
            {t('tournaments.addStudentToTournament', 'Додати студента до турніру')}
          </DialogTitle>
          <DialogDescription className="font-mono">
            {t('tournaments.addStudentDescription', 'Додайте студента за email або перегляньте поточних учасників')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs defaultValue="add-student" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add-student" className="font-mono">
                <UserPlus className="h-4 w-4 mr-2" />
                {t('tournaments.addStudent', 'Додати студента')}
              </TabsTrigger>
              <TabsTrigger value="students" className="font-mono">
                <Users className="h-4 w-4 mr-2" />
                {t('tournaments.students', 'Студенти')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="add-student" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-base">
                    <Mail className="h-4 w-4" />
                    {t('tournaments.addStudentByEmail', 'Додати студента за email')}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {t('tournaments.addStudentEmailDescription', 'Введіть email студента, щоб додати його до турніру')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddStudent} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="font-mono text-sm font-medium">
                        {t('common.email', 'Email')}
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('tournaments.enterStudentEmail', 'Введіть email студента...')}
                        className="font-mono"
                        disabled={loading}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={loading || !email.trim()}
                        className="font-mono"
                      >
                        {loading ? t('common.adding', 'Додавання...') : t('tournaments.addStudent', 'Додати студента')}
                      </Button>
                    </DialogFooter>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-base">
                    <Users className="h-4 w-4" />
                    {t('tournaments.currentStudents', 'Поточні студенти')}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {t('tournaments.currentStudentsDescription', 'Список студентів, які вже приєдналися до турніру')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {studentsLoading ? (
                    <Loading fullScreen={false} />
                  ) : students.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-mono font-semibold mb-2">
                        {t('tournaments.noStudentsYet', 'Ще немає студентів')}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {t('tournaments.addFirstStudent', 'Додайте першого студента за допомогою форми вище')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {students.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-mono font-medium text-primary">
                                {student.first_name?.[0]?.toUpperCase() || student.email[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-mono text-sm font-medium">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {student.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {student.role}
                            </Badge>
                            <Badge className="font-mono text-xs">
                              {student.status === 'registered' 
                                ? t('tournaments.registered', 'Зареєстровано')
                                : student.status === 'active'
                                ? t('tournaments.active', 'Активний')
                                : student.status
                              }
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentModal;
