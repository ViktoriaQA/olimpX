import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Settings, Database, Users, Activity, Clock, AlertTriangle, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { config } from "@/config";

interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  expired_sessions: number;
  oldest_session_date: string;
  newest_session_date: string;
}

interface DeletableSessions {
  deletable_sessions: number;
  days_threshold: number;
  cutoff_date: string;
}

interface CronStatus {
  status: string;
  tasks: Record<string, boolean>;
  next_run: Record<string, string>;
}

interface CronLog {
  id: string;
  action: string;
  details: {
    deleted_sessions: number;
    days_threshold: number;
    cleanup_date: string;
    automatic: boolean;
  };
  created_at: string;
}

const AdminSessionCleaner = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [deletableSessions, setDeletableSessions] = useState<DeletableSessions | null>(null);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [cronLogs, setCronLogs] = useState<CronLog[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState(10);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchSessionStats();
    fetchDeletableSessions();
    fetchCronStatus();
    fetchCronLogs();
  }, [user, navigate]);

  useEffect(() => {
    fetchDeletableSessions();
  }, [daysThreshold]);

  const fetchCronStatus = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/api/admin/cron/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch cron status');
      }
      
      const data = await response.json();
      setCronStatus(data);
    } catch (error) {
      console.error('Failed to fetch cron status:', error);
    }
  };

  const fetchCronLogs = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/api/admin/cron/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch cron logs');
      }
      
      const data = await response.json();
      setCronLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch cron logs:', error);
    }
  };

  const handleManualCleanup = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/api/admin/cron/cleanup-now`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days: daysThreshold })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start manual cleanup');
      }
      
      const data = await response.json();
      toast({
        title: "Успіх",
        description: data.message,
      });
      
      // Refresh data
      fetchSessionStats();
      fetchDeletableSessions();
      fetchCronLogs();
    } catch (error) {
      console.error('Failed to start manual cleanup:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося запустити очищення",
        variant: "destructive",
      });
    }
  };

  const fetchDeletableSessions = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/api/admin/sessions-count?days=${daysThreshold}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch deletable sessions count');
      }
      
      const data = await response.json();
      setDeletableSessions(data);
    } catch (error) {
      console.error('Failed to fetch deletable sessions count:', error);
    }
  };

  const fetchSessionStats = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch session stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch session stats:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося завантажити статистику сесій",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanExpiredSessions = async () => {
    setIsCleaning(true);
    try {
      const response = await fetch(`${config.api.baseUrl}/api/admin/clean?days=${daysThreshold}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to clean sessions');
      }
      
      const data = await response.json();
      toast({
        title: "Успіх",
        description: `Видалено ${data.deleted_sessions} застарілих сесій`,
      });
      
      // Refresh stats
      fetchSessionStats();
      fetchDeletableSessions();
      fetchCronLogs();
    } catch (error) {
      console.error('Failed to clean sessions:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося очистити сесії",
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/settings')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад до налаштувань
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Очищення сесій</h1>
              <p className="text-gray-600">Керування застарілими сесіями користувачів</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Session Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Статистика сесій
              </CardTitle>
              <CardDescription>
                Поточний стан сесій в системі
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-gray-600">Завантаження статистики...</p>
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Users className="w-4 h-4" />
                        <span className="font-semibold">Всього сесій</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-700">{stats.total_sessions}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600">
                        <Activity className="w-4 h-4" />
                        <span className="font-semibold">Активні</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">{stats.active_sessions}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-red-600">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold">Застарілі</span>
                      </div>
                      <p className="text-2xl font-bold text-red-700">{stats.expired_sessions}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-600">
                        <span className="font-semibold">Період</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {stats.oldest_session_date && stats.newest_session_date ? 
                          `${new Date(stats.oldest_session_date).toLocaleDateString()} - ${new Date(stats.newest_session_date).toLocaleDateString()}` 
                          : 'Немає даних'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Button onClick={fetchSessionStats} variant="outline" className="w-full">
                      Оновити статистику
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600">Не вдалося завантажити статистику</p>
                  <Button onClick={fetchSessionStats} className="mt-2">
                    Спробувати знову
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Cleaning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Очищення сесій
              </CardTitle>
              <CardDescription>
                Видалення застарілих сесій для оптимізації бази даних
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="daysThreshold" className="text-sm font-medium">
                    Видалити сесії старіші за (днів):
                  </Label>
                  <Input
                    id="daysThreshold"
                    type="number"
                    min="1"
                    max="365"
                    value={daysThreshold}
                    onChange={(e) => setDaysThreshold(parseInt(e.target.value) || 10)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Сесії, які не використовувалися довше зазначеного періоду, будуть видалені
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">Увага!</p>
                      <p>Після очищення сесій користувачам доведеться заново увійти в систему.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="flex-1 gap-2"
                        disabled={isCleaning || !deletableSessions || deletableSessions.deletable_sessions === 0}
                      >
                        <Trash2 className="w-4 h-4" />
                        {isCleaning ? 'Очищення...' : `Очистити ${deletableSessions?.deletable_sessions || 0} сесій`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Підтвердіть очищення сесій</AlertDialogTitle>
                        <AlertDialogDescription>
                          Видалення {deletableSessions?.deletable_sessions || 0} сесій, які не використовувалися більше {daysThreshold} днів.
                          <br /><br />
                          Ця дія незворотна. Користувачам доведеться заново увійти в систему.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Скасувати</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCleanExpiredSessions}>
                          Очистити сесії
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button 
                    variant="outline" 
                    onClick={handleManualCleanup}
                    disabled={isCleaning}
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Запустити зараз
                  </Button>
                </div>

                {deletableSessions && deletableSessions.deletable_sessions === 0 && (
                  <div className="text-center py-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Немає сесій старших за {daysThreshold} днів для очищення
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cron Status and Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cron Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Статус автоматичного очищення
              </CardTitle>
              <CardDescription>
                Стан запланованих завдань очищення сесій
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cronStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold">Щомісячне очищення</span>
                      </div>
                      <div className="mt-2">
                        <Badge variant={cronStatus.tasks['monthly-cleanup'] ? 'default' : 'secondary'}>
                          {cronStatus.tasks['monthly-cleanup'] ? 'Активно' : 'Неактивно'}
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        Наступний запуск: {cronStatus.next_run?.monthly_cleanup || 'Невідомо'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Button onClick={fetchCronStatus} variant="outline" className="w-full">
                      Оновити статус
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600">Завантаження статусу...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cron Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Історія очищення
              </CardTitle>
              <CardDescription>
                Журнал автоматичного та ручного очищення сесій
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cronLogs.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cronLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.details.automatic ? 'default' : 'secondary'}>
                            {log.details.automatic ? 'Авто' : 'Ручне'}
                          </Badge>
                          <span className="text-sm font-medium">
                            {log.details.deleted_sessions} сесій
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Поріг: {log.details.days_threshold} днів
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600">Немає записів про очищення</p>
                </div>
              )}

              <div className="border-t pt-4">
                <Button onClick={fetchCronLogs} variant="outline" className="w-full">
                  Оновити логи
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Рекомендації щодо очищення
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-700 mb-2">Регулярність</h4>
                <p className="text-sm text-blue-600">
                  Рекомендується очищати сесії раз на місяць для підтримки продуктивності системи
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-700 mb-2">Безпека</h4>
                <p className="text-sm text-green-600">
                  Застарілі сесії можуть становити загрозу безпеці, їх варто видаляти регулярно
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-700 mb-2">Продуктивність</h4>
                <p className="text-sm text-purple-600">
                  Очищення сесій покращує швидкодію бази даних та зменшує її розмір
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSessionCleaner;
