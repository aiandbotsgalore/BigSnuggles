import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    verifySubscription();
  }, []);

  const verifySubscription = async () => {
    try {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setStatus('error');
        return;
      }

      // Wait a moment for Stripe webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fetch updated subscription status
      const response = await fetch('http://localhost:8000/api/subscription/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setSubscription(data.data);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-600" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Verifying your subscription...
          </h2>
          <p className="mt-2 text-gray-600">
            Please wait while we confirm your payment
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-gray-600">
            We couldn't verify your subscription. Please contact support if you were charged.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => navigate('/subscription')}
              variant="outline"
              className="flex-1"
            >
              View Subscription
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Welcome to {subscription?.tier === 'pro' ? 'Pro' : 'Premium'}!
        </h2>
        <p className="mt-2 text-gray-600">
          Your subscription has been activated successfully. You now have access to all {subscription?.tier} features.
        </p>

        <div className="mt-6 rounded-lg bg-purple-50 p-4">
          <h3 className="font-semibold text-purple-900">What's included:</h3>
          <ul className="mt-2 space-y-1 text-left text-sm text-purple-800">
            {subscription?.tier === 'pro' ? (
              <>
                <li>✓ Unlimited AI conversations</li>
                <li>✓ 100 highlight clips per month</li>
                <li>✓ 10,000 memory entries</li>
                <li>✓ Priority support</li>
                <li>✓ Advanced analytics</li>
                <li>✓ API access</li>
              </>
            ) : (
              <>
                <li>✓ 500 AI conversations per month</li>
                <li>✓ 50 highlight clips per month</li>
                <li>✓ 5,000 memory entries</li>
                <li>✓ Priority support</li>
                <li>✓ Ad-free experience</li>
              </>
            )}
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => navigate('/subscription')}
            variant="outline"
            className="flex-1"
          >
            View Subscription
          </Button>
          <Button
            onClick={() => navigate('/chat')}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            Start Using
          </Button>
        </div>
      </div>
    </div>
  );
}
