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
    if (!isAuthenticated) {
      console.log('❌ [FRONTEND] User not authenticated, skipping history fetch');
      return;
    }
    
    console.log('📋 [FRONTEND] Fetching subscription history...');
    console.log('👤 [FRONTEND] User ID:', user?.id);
    console.log('⏰ [FRONTEND] Fetch timestamp:', new Date().toISOString());
    
    setHistoryLoading(true);
    try {
      console.log('📡 [FRONTEND] Sending request to backend for history...');
      const response = await subscriptionService.getSubscriptionHistory();
      console.log('✅ [FRONTEND] Subscription history response:', response);
      console.log('📊 [FRONTEND] History data:', response.data);
      console.log('📈 [FRONTEND] Number of subscriptions:', response.data?.length || 0);
      
      // Log each subscription details
      if (response.data && response.data.length > 0) {
        response.data.forEach((sub, index) => {
          console.log(`📋 [FRONTEND] Subscription ${index + 1}:`, {
            id: sub.id,
            plan_name: sub.plan_name,
            status: sub.status,
            start_date: sub.start_date,
            end_date: sub.end_date,
            price: sub.price,
            auto_renewal: sub.auto_renewal
          });
        });
      }
      
      setSubscriptionHistory(response.data);
      console.log('✅ [FRONTEND] Subscription history updated in state');
    } catch (error) {
      console.error('❌ [FRONTEND] Failed to fetch subscription history:', error);
      console.error('❌ [FRONTEND] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        userId: user?.id
      });
      toast({
        title: "Помилка",
        description: "Не вдалося завантажити історію підписок",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 [FRONTEND] History fetch completed');
      setHistoryLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      console.log('❌ [FRONTEND] User not authenticated, redirecting to auth');
      toast({
        title: "Необхідна авторизація",
        description: "Будь ласка, увійдіть в акаунт для оформлення підписки",
      });
      navigate('/auth');
      return;
    }

    try {
      console.log('🚀 [FRONTEND] Initiating subscription process...');
      console.log('👤 [FRONTEND] User info:', { id: user?.id, email: user?.email, nickname: user?.nickname });
      console.log('📦 [FRONTEND] Plan ID:', planId);
      console.log('⏰ [FRONTEND] Start time:', new Date().toISOString());
      
      setProcessing(planId);
      console.log('⏳ [FRONTEND] Set processing state for plan:', planId);
      
      console.log('📡 [FRONTEND] Sending request to backend...');
      const response = await subscriptionService.initiateSubscription(planId);
      console.log('✅ [FRONTEND] Backend response received:', response);
      console.log('🔗 [FRONTEND] Checkout URL:', response.checkout_url);
      console.log('🆔 [FRONTEND] Order ID:', response.order_id);
      console.log('💳 [FRONTEND] Payment ID:', response.payment_id);
      
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
        console.log('🔗 [FRONTEND] Redirecting to Monobank checkout...');
        console.log('🌐 [FRONTEND] Checkout URL:', response.checkout_url);
        console.log('📋 [FRONTEND] SessionStorage contents:', {
          last_order_id: sessionStorage.getItem('last_order_id'),
          last_payment_id: sessionStorage.getItem('last_payment_id')
        });
        
        // Show toast before redirect
        toast({
          title: "Перенаправлення на оплату",
          description: "Вас буде перенаправлено на сторінку оплати Monobank",
        });
        
        // Small delay to show toast
        setTimeout(() => {
          window.location.href = response.checkout_url;
        }, 1000);
      } else {
        console.log('❌ [FRONTEND] No checkout URL in response');
        console.log('❌ [FRONTEND] Full response:', JSON.stringify(response, null, 2));
        toast({
          title: "Помилка",
          description: "Не вдалося створити платіж",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('💥 [FRONTEND] Subscription error:', error);
      console.error('💥 [FRONTEND] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        planId,
        userId: user?.id
      });
      toast({
        title: "Помилка підписки",
        description: error instanceof Error ? error.message : "Не вдалося оформити підписку",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 [FRONTEND] Subscription process finished, clearing processing state');
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
      case 'initiated':
        return 'bg-blue-100 text-blue-800';
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
      case 'initiated':
        return 'Ініційовано';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-mono text-primary neon-text mb-4">Підписки</h1>
          <p className="text-muted-foreground font-mono">Завантаження...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold font-mono text-primary neon-text mb-4">
          Підписки
        </h1>
        <p className="text-muted-foreground font-mono max-w-3xl mx-auto">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <div 
                  key={plan.id} 
                  className={`subscription-card relative overflow-hidden rounded-lg border border-border bg-card p-6 space-y-4 ${
                    plan.is_popular 
                      ? 'popular ring-2 ring-primary shadow-lg scale-105' 
                      : ''
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-lg">
                      <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono">
                        <Crown className="w-3 h-3 mr-1" />
                        Популярний
                      </Badge>
                    </div>
                  )}

                  <div className="text-center pb-4">
                    <div className="flex justify-center mb-2">
                      {plan.target_audience === 'student' && (
                        <Users className="w-8 h-8 text-primary icon-hover animate-pulse-glow" />
                      )}
                      {plan.target_audience === 'trainer' && (
                        <Star className="w-8 h-8 text-primary icon-hover animate-pulse-glow" />
                      )}
                      {plan.target_audience === 'all' && (
                        <Crown className="w-8 h-8 text-primary icon-hover animate-pulse-glow" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold font-mono text-card-foreground mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono mb-4">
                      {plan.description}
                    </p>
                    <div className="mb-4">
                      <span className="text-3xl font-bold font-mono text-primary">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground font-mono ml-2">грн./{plan.duration}</span>
                    </div>
                  </div>

                  <div className="pb-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 feature-item">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-card-foreground font-mono text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={processing === plan.id}
                      className={`subscription-button w-full font-mono ${
                        plan.is_popular 
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      {processing === plan.id ? (
                        <span>Обробка...</span>
                      ) : (
                        <span className="text-green-600">Оформити підписку</span>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredPlans.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-mono">
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
                <p className="text-muted-foreground font-mono mb-4">
                  Для перегляду історії підписок необхідно увійти в акаунт
                </p>
                <Button onClick={() => navigate('/auth')}>
                  Увійти в акаунт
                </Button>
              </div>
            ) : historyLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground font-mono">Завантаження історії...</p>
              </div>
            ) : subscriptionHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-mono">
                  У вас немає підписок
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-bold font-mono text-card-foreground mb-6">Ваша історія підписок</h2>
                {subscriptionHistory
                  .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                  .map((subscription) => (
                  <div key={subscription.id} className="rounded-lg border border-border bg-card p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold font-mono text-card-foreground">{subscription.plan_name}</h3>
                        <p className="text-sm text-muted-foreground font-mono mt-1">
                          Підписка #{subscription.id}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(subscription.status)} font-mono text-xs`}>
                        {getStatusText(subscription.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground font-mono">Початок</p>
                          <p className="text-card-foreground font-mono">{new Date(subscription.start_date).toLocaleDateString('uk-UA')}</p>
                        </div>
                      </div>
                      {subscription.end_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground font-mono">Кінець</p>
                            <p className="text-card-foreground font-mono">{new Date(subscription.end_date).toLocaleDateString('uk-UA')}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground font-mono">Вартість</p>
                          <p className="text-card-foreground font-mono">{subscription.price} грн. /{subscription.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground font-mono">Автопоновлення</p>
                          <p className="text-card-foreground font-mono">{subscription.auto_renewal ? 'Так' : 'Ні'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default Subscription;
