import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Star, Users, History, Calendar, CreditCard } from "lucide-react";
import { subscriptionService, SubscriptionHistory } from "../services/subscriptionService";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  features: string[];
  target_audience: 'student' | 'trainer' | 'all';
  is_popular?: boolean;
  is_active?: boolean;
}

const Subscription = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("plans");

  useEffect(() => {
    fetchSubscriptionPlans();
    if (isAuthenticated) {
      fetchSubscriptionHistory();
    }
  }, [isAuthenticated]);

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await subscriptionService.getPlans();
      // Filter active plans for regular users, show all for admins
      const filteredPlans = user?.role === 'admin' 
        ? response.data 
        : response.data.filter(plan => plan.is_active !== false);
      setPlans(filteredPlans);
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося завантажити плани підписок",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionHistory = async () => {
    if (!isAuthenticated) return;
    
    console.log('📋 [FRONTEND] Fetching subscription history...');
    setHistoryLoading(true);
    try {
      const response = await subscriptionService.getSubscriptionHistory();
      console.log('✅ [FRONTEND] Subscription history response:', response);
      setSubscriptionHistory(response.data);
    } catch (error) {
      console.error('❌ [FRONTEND] Failed to fetch subscription history:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося завантажити історію підписок",
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Необхідна авторизація",
        description: "Будь ласка, увійдіть в акаунт для оформлення підписки",
      });
      navigate('/auth');
      return;
    }

    try {
      console.log('🚀 [FRONTEND] Initiating subscription...');
      console.log('📦 [FRONTEND] Plan ID:', planId);
      
      setProcessing(planId);
      const response = await subscriptionService.initiateSubscription(planId);
      
      console.log('✅ [FRONTEND] Payment initiation response:', response);
      
      // Store order_id and payment_id in sessionStorage for success page
      if (response.order_id) {
        sessionStorage.setItem('last_order_id', response.order_id);
        console.log('💾 [FRONTEND] Stored order_id in sessionStorage:', response.order_id);
      }
      if (response.payment_id) {
        sessionStorage.setItem('last_payment_id', response.payment_id);
        console.log('💾 [FRONTEND] Stored payment_id in sessionStorage:', response.payment_id);
      }
      
      if (response.checkout_url) {
        console.log('🔗 [FRONTEND] Redirecting to checkout:', response.checkout_url);
        window.location.href = response.checkout_url;
      } else {
        console.log('❌ [FRONTEND] No checkout URL in response');
        toast({
          title: "Помилка",
          description: "Не вдалося створити платіж",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Помилка підписки",
        description: error instanceof Error ? error.message : "Не вдалося оформити підписку",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const filteredPlans = plans.filter(plan => {
    if (!user) return plan.target_audience === 'all';
    return plan.target_audience === 'all' || plan.target_audience === user.role;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активна';
      case 'cancelled':
        return 'Скасована';
      case 'expired':
        return 'Завершена';
      case 'pending':
        return 'Очікує';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Підписки</h1>
            <p className="text-xl text-gray-300">Завантаження...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Підписки
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {user 
              ? `Вітаємо, ${user.nickname || user.first_name}! Оберіть оптимальний план для вашої ${user.role === 'student' ? 'навчальної роботи' : 'тренерської роботи'}`
              : "Оберіть план, який найкраще відповідає вашим потребам"
            }
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Плани підписок
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" disabled={!isAuthenticated}>
              <History className="w-4 h-4" />
              Історія підписок
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            {user?.role === 'admin' && (
              <div className="text-center mb-8">
                <Button
                  onClick={() => navigate('/admin/subscriptions')}
                  variant="outline"
                  className="gap-2"
                >
                  <Star className="w-4 h-4" />
                  Керувати планами підписок
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                    plan.is_popular 
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
                    <CardTitle className="text-2xl font-bold text-green-400">{plan.name}</CardTitle>
                    <CardDescription className="text-gray-300">
                      {plan.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-green-400">
                        ₴{plan.price}
                      </span>
                      <span className="text-gray-300 ml-2">/{plan.duration}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-200">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={processing === plan.id}
                      className={`w-full ${
                        plan.is_popular 
                          ? 'bg-blue-500 hover:bg-blue-600' 
                          : 'bg-gray-900 hover:bg-gray-800'
                      } text-white`}
                    >
                      {processing === plan.id ? (
                        <span>Обробка...</span>
                      ) : (
                        <span>Оформити підписку</span>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {filteredPlans.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xl text-gray-300">
                  {user 
                    ? "Наразі немає доступних планів підписки для вашої ролі"
                    : "Наразі немає доступних планів підписки"
                  }
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {!isAuthenticated ? (
              <div className="text-center py-12">
                <p className="text-xl text-gray-300 mb-4">
                  Для перегляду історії підписок необхідно увійти в акаунт
                </p>
                <Button onClick={() => navigate('/auth')}>
                  Увійти в акаунт
                </Button>
              </div>
            ) : historyLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-xl text-gray-300">Завантаження історії...</p>
              </div>
            ) : subscriptionHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-300">
                  У вас ще немає історії підписок
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-6">Історія ваших підписок</h2>
                {subscriptionHistory.map((subscription) => (
                  <Card key={subscription.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl text-white">{subscription.plan_name}</CardTitle>
                          <CardDescription className="text-gray-400 mt-1">
                            Підписка #{subscription.id}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(subscription.status)}>
                          {getStatusText(subscription.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-400">Початок</p>
                            <p className="text-white">{new Date(subscription.start_date).toLocaleDateString('uk-UA')}</p>
                          </div>
                        </div>
                        {subscription.end_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-400">Кінець</p>
                              <p className="text-white">{new Date(subscription.end_date).toLocaleDateString('uk-UA')}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-400">Вартість</p>
                            <p className="text-white">₴{subscription.price}/{subscription.duration}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-400">Автопоновлення</p>
                            <p className="text-white">{subscription.auto_renewal ? 'Так' : 'Ні'}</p>
                          </div>
                        </div>
                      </div>
                      {subscription.payment_method && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <p className="text-sm text-gray-400">Спосіб оплати: {subscription.payment_method}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Subscription;
