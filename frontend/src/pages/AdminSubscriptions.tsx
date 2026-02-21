import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, ArrowLeft, Crown, Star, Users, Check } from "lucide-react";
import { subscriptionService, SubscriptionPlan } from "../services/subscriptionService";

const AdminSubscriptions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    features: '',
    target_audience: 'all' as 'student' | 'trainer' | 'all',
    is_popular: false,
    is_active: true,
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchPlans();
  }, [user, navigate]);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionService.getAllPlansAdmin();
      setPlans(response.data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося завантажити плани підписок",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      features: '',
      target_audience: 'all',
      is_popular: false,
      is_active: true,
    });
    setEditingPlan(null);
  };

  const handleCreatePlan = async () => {
    try {
      const features = formData.features.split('\n').filter(f => f.trim());
      const planData = {
        ...formData,
        price: parseFloat(formData.price),
        features,
      };

      await subscriptionService.createPlan(planData);
      toast({
        title: "Успіх",
        description: "План підписки створено",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Create plan error:', error);
      toast({
        title: "Помилка",
        description: error instanceof Error ? error.message : "Не вдалося створити план",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    try {
      const features = formData.features.split('\n').filter(f => f.trim());
      const planData = {
        ...formData,
        price: parseFloat(formData.price),
        features,
      };

      await subscriptionService.updatePlan(editingPlan.id, planData);
      toast({
        title: "Успіх",
        description: "План підписки оновлено",
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Update plan error:', error);
      toast({
        title: "Помилка",
        description: error instanceof Error ? error.message : "Не вдалося оновити план",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await subscriptionService.deletePlan(planId);
      toast({
        title: "Успіх",
        description: "План підписки видалено",
      });
      fetchPlans();
    } catch (error) {
      console.error('Delete plan error:', error);
      toast({
        title: "Помилка",
        description: error instanceof Error ? error.message : "Не вдалося видалити план",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      await subscriptionService.updatePlan(plan.id, {
        ...plan,
        is_active: !plan.is_active
      });
      toast({
        title: "Успіх",
        description: `План підписки ${plan.is_active ? 'деактивовано' : 'активовано'}`,
      });
      fetchPlans();
    } catch (error) {
      console.error('Toggle active error:', error);
      toast({
        title: "Помилка",
        description: error instanceof Error ? error.message : "Не вдалося змінити статус плану",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      duration: plan.duration,
      features: plan.features.join('\n'),
      target_audience: plan.target_audience,
      is_popular: plan.is_popular || false,
      is_active: plan.is_active !== false,
    });
    setIsEditDialogOpen(true);
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
              onClick={() => navigate('/subscription')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад до підписок
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Керування підписками</h1>
              <p className="text-gray-600">Створюйте та редагуйте плани підписок</p>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Створити план
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Створити новий план підписки</DialogTitle>
                <DialogDescription>
                  Заповніть деталі нового плану підписки
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Назва плану</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Наприклад: Базовий"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Ціна (₴)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="199"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Тривалість</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="місяць/рік"
                    />
                  </div>
                  <div>
                    <Label htmlFor="target_audience">Цільова аудиторія</Label>
                    <Select
                      value={formData.target_audience}
                      onValueChange={(value: 'student' | 'trainer' | 'all') => 
                        setFormData(prev => ({ ...prev, target_audience: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Всі</SelectItem>
                        <SelectItem value="student">Студенти</SelectItem>
                        <SelectItem value="trainer">Тренери</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Опис</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Опис плану підписки"
                  />
                </div>

                <div>
                  <Label htmlFor="features">Особливості (кожна з нового рядка)</Label>
                  <Textarea
                    id="features"
                    value={formData.features}
                    onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                    placeholder="Доступ до всіх тренувань&#10;Персональний план&#10;Підтримка тренера"
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_popular"
                      checked={formData.is_popular}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
                    />
                    <Label htmlFor="is_popular">Популярний план</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">Активний</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Скасувати
                </Button>
                <Button onClick={handleCreatePlan}>Створити</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">Завантаження...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  !plan.is_active 
                    ? 'opacity-75 border-gray-300 bg-gray-50' 
                    : plan.is_popular 
                      ? 'ring-2 ring-blue-500 shadow-lg scale-105' 
                      : 'shadow-md'
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 rounded-bl-lg">
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                      <Crown className="w-3 h-3 mr-1" />
                      Популярний
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-2">
                    {plan.target_audience === 'student' && (
                      <Users className="w-8 h-8 text-blue-500" />
                    )}
                    {plan.target_audience === 'trainer' && (
                      <Star className="w-8 h-8 text-green-500" />
                    )}
                    {plan.target_audience === 'all' && (
                      <Crown className="w-8 h-8 text-purple-500" />
                    )}
                  </div>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <div className="flex gap-1">
                      {!plan.is_active && (
                        <Badge variant="destructive">Неактивний</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-gray-600">
                    {plan.description}
                  </CardDescription>
                  <div className="text-2xl font-bold">
                    ₴{plan.price}
                    <span className="text-sm font-normal text-gray-600 ml-1">/{plan.duration}</span>
                  </div>
                </CardHeader>

                <CardContent className="pb-6">
                  <div className="space-y-2 mb-4">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {plan.features.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{plan.features.length - 3} ще...
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(plan)}
                      className="flex-1 gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Редагувати
                    </Button>
                    <Button
                      variant={plan.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleActive(plan)}
                      className="gap-1"
                    >
                      {plan.is_active ? 'Деактивувати' : 'Активувати'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-1">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ви впевнені?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ця дія назавжди видалить план підписки "{plan.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Скасувати</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>
                            Видалити
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">Немає створених планів підписок</p>
            <Button 
              className="mt-4 gap-2" 
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Створити перший план
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редагувати план підписки</DialogTitle>
            <DialogDescription>
              Внесіть зміни в план підписки
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Назва плану</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Наприклад: Базовий"
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Ціна (₴)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="199"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-duration">Тривалість</Label>
                <Input
                  id="edit-duration"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="місяць/рік"
                />
              </div>
              <div>
                <Label htmlFor="edit-target_audience">Цільова аудиторія</Label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value: 'student' | 'trainer' | 'all') => 
                    setFormData(prev => ({ ...prev, target_audience: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всі</SelectItem>
                    <SelectItem value="student">Студенти</SelectItem>
                    <SelectItem value="trainer">Тренери</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Опис</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Опис плану підписки"
              />
            </div>

            <div>
              <Label htmlFor="edit-features">Особливості (кожна з нового рядка)</Label>
              <Textarea
                id="edit-features"
                value={formData.features}
                onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                placeholder="Доступ до всіх тренувань&#10;Персональний план&#10;Підтримка тренера"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_popular"
                  checked={formData.is_popular}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
                />
                <Label htmlFor="edit-is_popular">Популярний план</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="edit-is_active">Активний</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleUpdatePlan}>Зберегти зміни</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
