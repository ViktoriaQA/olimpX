import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, X, RefreshCw, Shield, Calendar, CreditCard, Search, Filter, Trash2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserManagementService, User } from "@/services/userManagementService";

const AdminUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [user, navigate, pagination.page]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, subscriptionFilter]);

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(u => 
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (subscriptionFilter !== 'all') {
      if (subscriptionFilter === 'active') {
        filtered = filtered.filter(u => u.subscription?.status === 'active');
      } else if (subscriptionFilter === 'cancelled') {
        filtered = filtered.filter(u => u.subscription?.status === 'cancelled');
      } else if (subscriptionFilter === 'free') {
        filtered = filtered.filter(u => u.subscription?.plan === 'Free');
      }
    }

    setFilteredUsers(filtered);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await UserManagementService.getUsers(pagination.page, pagination.limit);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося завантажити список користувачів",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setActionLoading(userId);
      await UserManagementService.updateUserRole(userId, newRole);
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole as any } : u
      ));
      
      toast({
        title: "Успіх",
        description: "Роль користувача оновлено",
      });
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося оновити роль користувача",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async (userId: string) => {
    try {
      setActionLoading(userId);
      await UserManagementService.cancelUserSubscription(userId);
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { 
          ...u, 
          subscription: u.subscription ? { 
            ...u.subscription, 
            status: 'cancelled' 
          } : undefined 
        } : u
      ));
      
      toast({
        title: "Успіх",
        description: "Підписку користувача скасовано",
      });
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося скасувати підписку",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanupSubscriptions = async (userId: string, userName: string) => {
    try {
      setActionLoading(userId);
      const result = await UserManagementService.cleanupUserSubscriptions(userId, true);
      
      // Refresh users to get updated subscription info
      await fetchUsers();
      
      toast({
        title: "Успіх",
        description: `Очищено підписки для ${userName}. Видалено: ${result.results.deletedSubscriptions} підписок, ${result.results.deletedPaymentAttempts} платежів, ${result.results.deletedRecurringSubscriptions} автоподовжень.`,
      });
    } catch (error) {
      console.error('Failed to cleanup subscriptions:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося очистити підписки",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'trainer': return 'default';
      case 'student': return 'secondary';
      default: return 'outline';
    }
  };

  const getSubscriptionBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'cancelled': return 'destructive';
      case 'expired': return 'secondary';
      default: return 'outline';
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
              <h1 className="text-3xl font-bold text-gray-900">Управління користувачами</h1>
              <p className="text-gray-600">Керування акаунтами, ролями та підписками</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={fetchUsers}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Оновити
          </Button>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Фільтри
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Пошук за іменем, email або nickname..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Фільтр за роллю" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі ролі</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Фільтр за підпискою" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі підписки</SelectItem>
                  <SelectItem value="active">Активні</SelectItem>
                  <SelectItem value="cancelled">Скасовані</SelectItem>
                  <SelectItem value="free">Безкоштовні</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Знайдено: {filteredUsers.length} з {pagination.total}
                </span>
                {(searchTerm || roleFilter !== 'all' || subscriptionFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                      setSubscriptionFilter('all');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Список користувачів ({pagination.total})
            </CardTitle>
            <CardDescription>
              Перегляд та керування всіма користувачами системи
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Завантаження...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Користувачів не знайдено</p>
                {(searchTerm || roleFilter !== 'all' || subscriptionFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                      setSubscriptionFilter('all');
                    }}
                    className="mt-4"
                  >
                    Скинути фільтри
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Користувач</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Підписка</TableHead>
                        <TableHead>Створено</TableHead>
                        <TableHead>Дії</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {user.first_name} {user.last_name}
                                {user.nickname && (
                                  <span className="text-gray-500 ml-2">(@{user.nickname})</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.id, value)}
                              disabled={actionLoading === user.id || user.role === 'admin'}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue>
                                  <Badge variant={getRoleBadgeVariant(user.role)}>
                                    {user.role}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">
                                  <Badge variant="outline">user</Badge>
                                </SelectItem>
                                <SelectItem value="student">
                                  <Badge variant="secondary">student</Badge>
                                </SelectItem>
                                <SelectItem value="trainer">
                                  <Badge variant="default">trainer</Badge>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={user.is_verified ? "default" : "secondary"}>
                                  Email: {user.is_verified ? "✓" : "✗"}
                                </Badge>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-2">
                                  <Badge variant={user.phone_verified ? "default" : "secondary"}>
                                    Phone: {user.phone_verified ? "✓" : "✗"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.subscription ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant={getSubscriptionBadgeVariant(user.subscription.status)}>
                                    {user.subscription.plan}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {user.subscription.status}
                                  </Badge>
                                </div>
                                {user.subscription.expires_at && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(user.subscription.expires_at)}
                                  </div>
                                )}
                                {user.subscription.status === 'active' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs"
                                        disabled={actionLoading === user.id}
                                      >
                                        <CreditCard className="w-3 h-3 mr-1" />
                                        Скасувати
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Скасувати підписку?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Ви впевнені, що хочете скасувати підписку для користувача {user.first_name} {user.last_name}?
                                          Ця дія негайно припинить дію підписки.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Відміна</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleCancelSubscription(user.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Скасувати підписку
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline">Free</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">
                              {formatDate(user.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/profile/${user.id}`)}
                              >
                                <Shield className="w-3 h-3 mr-1" />
                                Профіль
                              </Button>
                              {(user.subscription || user.role === 'admin') && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-xs"
                                      disabled={actionLoading === user.id}
                                    >
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      Очистити
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Очистити підписки?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Ви впевнені, що хочете очистити всі тестові підписки для користувача {user.first_name} {user.last_name}?
                                        <br /><br />
                                        <strong>Буде збережено:</strong> остання активна підписка (якщо є)
                                        <br />
                                        <strong>Буде видалено:</strong> всі інші підписки, платежі та автоподовження
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Відміна</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleCleanupSubscriptions(user.id, `${user.first_name} ${user.last_name}`)}
                                        className="bg-orange-600 hover:bg-orange-700"
                                      >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Очистити підписки
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Показано {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} з {pagination.total}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page <= 1}
                      >
                        Попередня
                      </Button>
                      <span className="text-sm">
                        Сторінка {pagination.page} з {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.pages}
                      >
                        Наступна
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;
