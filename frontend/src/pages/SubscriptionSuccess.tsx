import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Home, Crown, Calendar, CreditCard } from "lucide-react";
import { subscriptionService } from "../services/subscriptionService";

interface SubscriptionDetails {
  id: string;
  plan_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  price: number;
  duration: string;
  auto_renewal: boolean;
  payment_method?: string;
}

const SubscriptionSuccess = () => {
  const { user, isAuthenticated, restoreSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false); // Prevent double verification

  useEffect(() => {
    // Skip if already verified
    if (isVerified) {
      console.log('⏭️ [SUCCESS] Already verified, skipping...');
      return;
    }
    
    console.log('🎯 [SUCCESS] SubscriptionSuccess page loaded');
    
    const sessionId = searchParams.get('session_id');
    const subscriptionId = searchParams.get('subscription_id');
    const orderId = searchParams.get('order_id');
    const paymentId = searchParams.get('payment_id');
    const transactionId = searchParams.get('transaction_id');
    
    // Log all URL parameters for debugging
    console.log('📋 [SUCCESS] URL params:', {
      sessionId,
      subscriptionId,
      orderId,
      paymentId,
      transactionId,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    // Try to find any valid payment identifier
    let paymentIdentifier = sessionId || subscriptionId || orderId || paymentId || transactionId;
    
    // If no URL params, try to get from sessionStorage (for cases where payment gateway doesn't pass params)
    if (!paymentIdentifier) {
      const lastOrderId = sessionStorage.getItem('last_order_id');
      const lastPaymentId = sessionStorage.getItem('last_payment_id');
      paymentIdentifier = lastOrderId || lastPaymentId;
      
      console.log('💾 [SUCCESS] No URL params found, trying sessionStorage:', {
        lastOrderId,
        lastPaymentId,
        paymentIdentifier
      });
    }
    
    // Additional fallback: check if we have any identifier in the URL that could work
    if (!paymentIdentifier && searchParams.has('order_id')) {
      paymentIdentifier = searchParams.get('order_id');
      console.log('🔍 [SUCCESS] Using order_id from URL as fallback:', paymentIdentifier);
    }
    
    console.log('🆔 [SUCCESS] Final payment identifier:', paymentIdentifier);
    
    if (!paymentIdentifier) {
      console.log('❌ [SUCCESS] No payment identifier found');
      toast({
        title: "Помилка",
        description: "Відсутня інформація про платіж",
        variant: "destructive",
      });
      navigate('/subscription');
      return;
    }

    const verifySubscription = async () => {
      try {
        console.log('🔍 [SUCCESS] Starting subscription verification...');
        console.log('👤 [SUCCESS] User authenticated:', isAuthenticated);
        console.log('🆔 [SUCCESS] Verifying payment identifier:', paymentIdentifier);
        
        setLoading(true);
        
        // First try to verify with our backend
        let response = await subscriptionService.verifySubscription(paymentIdentifier);
        console.log('📊 [SUCCESS] Backend verification response:', response);
        
        // If backend verification fails, try to check payment status directly with payment gateway
        if (!response.success && response.error?.includes('Payment not found')) {
          console.log('🔄 [SUCCESS] Backend verification failed, trying direct payment gateway check...');
          
          try {
            // Check payment status directly with payment gateway
            const paymentResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/payment/check-status/${paymentIdentifier}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
              }
            });
            
            const paymentData = await paymentResponse.json();
            console.log('🔍 [SUCCESS] Direct payment gateway check response:', paymentData);
            
            if (paymentData.success && paymentData.status === 'completed') {
              // If payment gateway shows completed, try backend verification again
              response = await subscriptionService.verifySubscription(paymentIdentifier);
              console.log('📊 [SUCCESS] Second backend verification response:', response);
            }
          } catch (paymentError) {
            console.error('❌ [SUCCESS] Direct payment gateway check failed:', paymentError);
          }
        }
        
        if (response.success) {
          console.log('🎉 [SUCCESS] Verification successful!');
          setSubscriptionDetails(response.data);
          setIsVerified(true); // Mark as verified
          // Clear sessionStorage after successful verification
          sessionStorage.removeItem('last_order_id');
          sessionStorage.removeItem('last_payment_id');
          console.log('🧹 [SUCCESS] Cleared sessionStorage');
          // Refresh user session to get updated subscription data
          await restoreSession();
          console.log('🔄 [SUCCESS] User session restored');
          toast({
            title: "Вітаємо!",
            description: "Підписку успішно оформлено!",
          });
        } else {
          console.log('❌ [SUCCESS] Verification failed');
          toast({
            title: "Помилка",
            description: response.error || "Не вдалося підтвердити підписку",
            variant: "destructive",
          });
          navigate('/subscription');
        }
      } catch (error) {
        console.error('💥 [SUCCESS] Subscription verification error:', error);
        toast({
          title: "Помилка",
          description: "Не вдалося підтвердити підписку. Будь ласка, зв'яжіться з підтримкою.",
          variant: "destructive",
        });
        navigate('/subscription');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      verifySubscription();
    } else {
      // If not authenticated, redirect to auth first
      toast({
        title: "Необхідна авторизація",
        description: "Будь ласка, увійдіть в акаунт для підтвердження підписки",
      });
      navigate('/auth');
    }
  }, [searchParams, isAuthenticated, navigate]);

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleViewSubscription = () => {
    navigate('/subscription?tab=history');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-300">Підтвердження підписки...</p>
        </div>
      </div>
    );
  }

  if (!subscriptionDetails) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-300 mb-4">Не вдалося завантажити деталі підписки</p>
          <Button onClick={() => navigate('/subscription')}>
            Повернутися до підписок
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Підписку успішно оформлено!
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Вітаємо, {user?.nickname || user?.first_name}! Ваша підписка активована.
          </p>
        </div>

        {/* Subscription Details Card */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-3">
              <Crown className="w-6 h-6 text-yellow-500" />
              {subscriptionDetails.plan_name}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Підписка #{subscriptionDetails.id}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Дата початку</p>
                    <p className="text-white font-medium">
                      {new Date(subscriptionDetails.start_date).toLocaleDateString('uk-UA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                
                {subscriptionDetails.end_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Дата закінчення</p>
                      <p className="text-white font-medium">
                        {new Date(subscriptionDetails.end_date).toLocaleDateString('uk-UA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Вартість</p>
                    <p className="text-green-600 font-medium">
                      {subscriptionDetails.price}/{subscriptionDetails.duration} грн. 
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Автопоновлення</p>
                    <p className="text-white font-medium">
                      {subscriptionDetails.auto_renewal ? 'Увімкнено' : 'Вимкнено'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            
            <div className="mt-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 text-sm">
                ✓ Підписка активна • Ви можете користуватися всіма перевагами вашого плану
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleGoHome}
            variant="outline"
            className="flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            <Home className="w-4 h-4" />
            На головну
          </Button>
          <Button
            onClick={handleViewSubscription}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Crown className="w-4 h-4" />
            Мої підписки
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">
            Якщо у вас виникли питання, будь ласка, зв'яжіться з нашою службою підтримки.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
