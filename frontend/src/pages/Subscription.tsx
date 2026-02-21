import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Users } from "lucide-react";
import { subscriptionService } from "../services/subscriptionService";

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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);

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
      setProcessing(planId);
      const response = await subscriptionService.initiateSubscription(planId);
      
      if (response.payment_url) {
        window.location.href = response.payment_url;
      } else {
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
            Оберіть план підписки
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {user 
              ? `Вітаємо, ${user.nickname || user.first_name}! Оберіть оптимальний план для вашого ${user.role === 'student' ? 'навчання' : 'тренерської роботи'}`
              : "Оберіть план, який найкраще відповідає вашим потребам"
            }
          </p>
        </div>

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
      </div>
    </div>
  );
};

export default Subscription;
