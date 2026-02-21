import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration_months: number;
  features: string[];
  is_active: boolean;
}

interface InitiateSubscriptionResponse {
  checkout_url: string;
  order_id: string;
  payment_id: string;
}

const SubscriptionPage: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPackages();
    
    // Check if there's a pending order from sessionStorage
    const pendingOrderId = sessionStorage.getItem('pending_order_id');
    if (pendingOrderId) {
      setPendingOrderId(pendingOrderId);
      checkPaymentStatus(pendingOrderId);
    }
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/v1/packages');
      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }
      const data = await response.json();
      setPackages(data.filter((pkg: Package) => pkg.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const initiateSubscription = async (packageId: string, billingCycle: 'monthly' | 'yearly') => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('/api/v1/payment/initiate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          package_id: packageId,
          billing_cycle: billingCycle,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate subscription');
      }

      const data: InitiateSubscriptionResponse = await response.json();
      
      // Store pending order ID in sessionStorage
      sessionStorage.setItem('pending_order_id', data.order_id);
      setPendingOrderId(data.order_id);

      // Redirect to LiqPay checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate subscription');
    }
  };

  const checkPaymentStatus = async (orderId: string) => {
    setCheckingStatus(true);
    try {
      const response = await fetch(`/api/v1/payment/status/public/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();
      
      if (data.status === 'completed') {
        // Payment successful
        sessionStorage.removeItem('pending_order_id');
        setPendingOrderId(null);
        // Show success message or redirect to success page
        alert('Payment successful! Your subscription is now active.');
        navigate('/dashboard');
      } else if (data.status === 'failed') {
        // Payment failed
        sessionStorage.removeItem('pending_order_id');
        setPendingOrderId(null);
        setError('Payment failed. Please try again.');
      } else if (data.status === 'processing') {
        // Still processing, check again after a delay
        setTimeout(() => checkPaymentStatus(orderId), 5000);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Subscription Plan
          </h1>
          <p className="text-xl text-gray-600">
            Select the perfect plan for your needs. Upgrade or downgrade at any time.
          </p>
        </div>

        {pendingOrderId && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">Payment Processing</h3>
                <p className="text-blue-700">
                  Your payment is being processed. Order ID: {pendingOrderId}
                </p>
              </div>
              {checkingStatus && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-medium text-red-900">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                {pkg.description && (
                  <p className="text-gray-600 mb-4">{pkg.description}</p>
                )}
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${pkg.price}
                  </span>
                  <span className="text-gray-600 ml-2">/ {pkg.duration_months === 1 ? 'month' : 'year'}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <button
                    onClick={() => initiateSubscription(pkg.id, 'monthly')}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
                  >
                    Subscribe Monthly
                  </button>
                  
                  {pkg.duration_months === 1 && (
                    <button
                      onClick={() => initiateSubscription(pkg.id, 'yearly')}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200"
                    >
                      Subscribe Yearly (Save 17%)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Why Choose Our Premium Plans?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Cancel Anytime</h4>
                <p className="text-gray-600">No long-term commitments or cancellation fees.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Secure Payments</h4>
                <p className="text-gray-600">Your payment information is encrypted and secure.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">24/7 Support</h4>
                <p className="text-gray-600">Get help whenever you need it from our support team.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
