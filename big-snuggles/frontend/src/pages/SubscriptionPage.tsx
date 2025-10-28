import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Sparkles, Crown, Zap, CreditCard, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

interface Subscription {
  tier: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface QuotaInfo {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  used: number;
  percentage?: number;
  unlimited?: boolean;
}

interface UsageData {
  conversations_count: number;
  clips_count: number;
  memories_count: number;
  rooms_created_count: number;
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [quotas, setQuotas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscription/usage?userId=${user.id}`
      );
      
      if (!response.ok) throw new Error('Failed to load subscription data');

      const data = await response.json();
      setSubscription(data.subscription);
      setUsage(data.usage);
      setQuotas(data.quotas);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user) return;

    setOpeningPortal(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscription/portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: user.id })
        }
      );

      if (!response.ok) throw new Error('Failed to create portal session');

      const data = await response.json();
      window.location.href = data.portal_url;
    } catch (error) {
      console.error('Error opening portal:', error);
      alert('Failed to open billing portal. Please try again.');
      setOpeningPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscription/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: user.id })
        }
      );

      if (!response.ok) throw new Error('Failed to cancel subscription');

      alert('Subscription cancelled. You will retain access until your current period ends.');
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium':
        return <Sparkles className="w-6 h-6 text-amber-500" />;
      case 'pro':
        return <Crown className="w-6 h-6 text-purple-500" />;
      default:
        return <Zap className="w-6 h-6 text-gray-400" />;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'premium':
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            Premium
          </Badge>
        );
      case 'pro':
        return (
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            Pro
          </Badge>
        );
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const renderQuotaCard = (
    title: string,
    icon: React.ReactNode,
    quota: QuotaInfo,
    upgradeMessage: string
  ) => {
    if (!quota) return null;

    const percentage = quota.percentage || 0;
    const isAtLimit = percentage >= 100;
    const isWarning = percentage >= 80 && percentage < 100;

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            {isAtLimit && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {quota.unlimited ? (
            <div className="text-sm text-gray-600">
              <p className="font-medium text-green-600">Unlimited</p>
              <p className="text-xs text-gray-500 mt-1">
                Used: {quota.used} this month
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {quota.used} of {quota.limit}
                </span>
                <span className={`font-medium ${isAtLimit ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-gray-900'}`}>
                  {quota.remaining} left
                </span>
              </div>

              <Progress
                value={percentage}
                className={`h-2 ${
                  isAtLimit ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-orange-500' : ''
                }`}
              />

              {isAtLimit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-800">
                    Quota exceeded. {upgradeMessage}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/pricing')}
                    className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Upgrade Plan
                  </Button>
                </div>
              )}

              {isWarning && !isAtLimit && (
                <p className="text-xs text-orange-600">
                  You've used {Math.round(percentage)}% of your quota this month
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading subscription...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Subscription Found</CardTitle>
            <CardDescription>Get started with Big Snuggles</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/pricing')} className="w-full">
              View Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your plan and usage</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTierIcon(subscription.tier)}
                    <div>
                      <CardTitle>Current Plan</CardTitle>
                      <CardDescription>
                        {subscription.status === 'active' ? 'Active' : 'Inactive'}
                      </CardDescription>
                    </div>
                  </div>
                  {getTierBadge(subscription.tier)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription.tier !== 'free' && subscription.current_period_end && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {subscription.cancel_at_period_end ? 'Access until' : 'Renews on'}:{' '}
                      {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                {subscription.cancel_at_period_end && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-800">
                      Your subscription is scheduled to cancel at the end of the billing period.
                      You will be downgraded to the free plan.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  {subscription.tier === 'free' ? (
                    <Button
                      onClick={() => navigate('/pricing')}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => navigate('/pricing')}
                        variant="outline"
                        className="flex-1"
                      >
                        Change Plan
                      </Button>
                      {!subscription.cancel_at_period_end && (
                        <Button
                          onClick={handleCancelSubscription}
                          disabled={cancelling}
                          variant="outline"
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Usage Quotas */}
            <div className="grid md:grid-cols-2 gap-4">
              {quotas && (
                <>
                  {renderQuotaCard(
                    'Conversations',
                    <Calendar className="w-4 h-4" />,
                    quotas.conversations,
                    'Upgrade to get unlimited conversations.'
                  )}
                  {renderQuotaCard(
                    'Clip Generation',
                    <Zap className="w-4 h-4" />,
                    quotas.clips,
                    'Upgrade for more clips per month.'
                  )}
                  {renderQuotaCard(
                    'Memories',
                    <Sparkles className="w-4 h-4" />,
                    quotas.memories,
                    'Upgrade for more memory storage.'
                  )}
                  {renderQuotaCard(
                    'Rooms Created',
                    <Crown className="w-4 h-4" />,
                    quotas.rooms_created,
                    'Upgrade to Premium to create rooms.'
                  )}
                </>
              )}
            </div>
          </div>

          {/* Billing Management */}
          <div className="space-y-6">
            {subscription.tier !== 'free' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleManageBilling}
                    disabled={openingPortal}
                    variant="outline"
                    className="w-full"
                  >
                    {openingPortal ? 'Opening...' : 'Manage Billing'}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Update payment method, view invoices, and more
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Have questions about your subscription or billing?
                </p>
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
