import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, Database, Users, Activity, Trash2, Shield, Bell, Palette, Globe, Lock, FileText, BarChart3, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { config } from "@/config";

interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  expired_sessions: number;
  oldest_session_date: string;
  newest_session_date: string;
}

const AdminSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SessionStats | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchSessionStats();
  }, [user, navigate]);

  const fetchSessionStats = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(config.auth.tokenKey)}`
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
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад до адмінки
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Налаштування системи</h1>
              <p className="text-gray-600">Керування параметрами платформи</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Session Management Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/session-cleaner')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Управління сесіями
              </CardTitle>
              <CardDescription>
                Очищення застарілих сесій користувачів
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-gray-600">Завантаження...</p>
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="text-lg font-bold text-blue-700">{stats.total_sessions}</p>
                      <p className="text-xs text-blue-600">Всього</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="text-lg font-bold text-green-700">{stats.active_sessions}</p>
                      <p className="text-xs text-green-600">Активні</p>
                    </div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <p className="text-lg font-bold text-red-700">{stats.expired_sessions}</p>
                    <p className="text-xs text-red-600">Застарілі</p>
                  </div>
                  {stats.expired_sessions > 0 && (
                    <Badge variant="destructive" className="w-full justify-center">
                      Потрібна очистка
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-sm">Не вдалося завантажити</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Management Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/users')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Управління користувачами
              </CardTitle>
              <CardDescription>
                Керування акаунтами та ролями
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Кількість користувачів</span>
                  <Badge variant="secondary">--</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Активні сьогодні</span>
                  <Badge variant="secondary">--</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Керувати користувачами
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/security')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Безпека
              </CardTitle>
              <CardDescription>
                Налаштування безпеки системи
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Двостороння автентифікація</span>
                  <Badge variant="outline">Налаштувати</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Політика паролів</span>
                  <Badge variant="outline">Налаштувати</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Керувати безпекою
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/notifications')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-600" />
                Сповіщення
              </CardTitle>
              <CardDescription>
                Налаштування сповіщень системи
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Email сповіщення</span>
                  <Badge variant="outline">Увімкнено</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Push сповіщення</span>
                  <Badge variant="outline">Налаштувати</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Керувати сповіщеннями
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/appearance')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                Зовнішній вигляд
              </CardTitle>
              <CardDescription>
                Налаштування інтерфейсу платформи
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Тема</span>
                  <Badge variant="outline">Світла</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Мова</span>
                  <Badge variant="outline">Українська</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Керувати виглядом
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Settings Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/system')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                Система
              </CardTitle>
              <CardDescription>
                Загальні системні налаштування
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Версія системи</span>
                  <Badge variant="secondary">1.0.0</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Статус</span>
                  <Badge className="bg-green-100 text-green-800">Активна</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Системні налаштування
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/analytics')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Аналітика
              </CardTitle>
              <CardDescription>
                Статистика та звіти системи
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Звіти</span>
                  <Badge variant="outline">Переглянути</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Експорт даних</span>
                  <Badge variant="outline">Доступно</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Перейти до аналітики
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Performance Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/performance')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-600" />
                Продуктивність
              </CardTitle>
              <CardDescription>
                Моніторинг та оптимізація
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Завантаження сервера</span>
                  <Badge className="bg-green-100 text-green-800">Нормальне</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">База даних</span>
                  <Badge className="bg-green-100 text-green-800">Оптимально</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Моніторинг
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Backup Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/backup')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Резервні копії
              </CardTitle>
              <CardDescription>
                Управління резервними копіями
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Остання копія</span>
                  <Badge variant="outline">--</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Автоматичні копії</span>
                  <Badge variant="outline">Увімкнено</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Керувати копіями
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
