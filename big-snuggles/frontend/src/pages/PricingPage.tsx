import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Check, X, Sparkles, Crown, Zap } from 'lucide-react';

interface Tier {
  tier: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: any;
  display_order: number;
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [creatingCheckout, setCreatingCheckout] = useState<string | null>(null);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subscription/tiers`);
      const data = await response.json();
      setTiers(data.tiers || []);
    } catch (error) {
      console.error('Error loading tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setCreatingCheckout(tier);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          tier,
          interval
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      window.location.href = data.checkout_url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout. Please try again.');
      setCreatingCheckout(null);
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50';
      case 'pro':
        return 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50';
      default:
        return 'border-gray-200';
    }
  };

  const getPrice = (tier: Tier) => {
    const price = interval === 'yearly' ? tier.price_yearly / 12 : tier.price_monthly;
    return price / 100; // Convert cents to dollars
  };

  const getSavings = (tier: Tier) => {
    if (interval === 'yearly' && tier.price_yearly > 0) {
      const monthlyTotal = tier.price_monthly * 12;
      const yearlySavings = monthlyTotal - tier.price_yearly;
      return (yearlySavings / 100).toFixed(0);
    }
    return 0;
  };

  const renderFeatureList = (features: any) => {
    const featureList = [];

    // Memories
    if (features.memories) {
      const memoryText = features.memories.unlimited
        ? 'Unlimited memories'
        : `${features.memories.limit} memories (${features.memories.retention_days} day retention)`;
      featureList.push({ text: memoryText, included: true });
    }

    // Conversations
    if (features.conversations) {
      const convText = features.conversations.unlimited
        ? 'Unlimited conversations'
        : `${features.conversations.monthly_limit} conversations/month`;
      featureList.push({ text: convText, included: true });
    }

    // Clips
    if (features.clips) {
      const clipsText = features.clips.unlimited
        ? 'Unlimited clip generation'
        : `${features.clips.monthly_limit} clips/month`;
      featureList.push({ text: clipsText, included: true });
    }

    // Rooms
    if (features.rooms) {
      const roomsText = features.rooms.can_create
        ? `Create rooms (${features.rooms.max_participants} participants)`
        : 'Join existing rooms';
      featureList.push({ text: roomsText, included: features.rooms.can_create });
    }

    // Personality modes
    if (features.personality_modes) {
      const modesText = features.personality_modes.custom_creation
        ? 'All modes + custom personalities'
        : `${features.personality_modes.available.length} personality modes`;
      featureList.push({ text: modesText, included: true });
    }

    // Voice quality
    if (features.voice) {
      featureList.push({
        text: `${features.voice.quality.charAt(0).toUpperCase() + features.voice.quality.slice(1)} voice quality`,
        included: true
      });
      if (features.voice.priority_processing) {
        featureList.push({ text: 'Priority processing', included: true });
      }
    }

    // Special features
    if (features.special_features && features.special_features.length > 0) {
      features.special_features.forEach((feature: string) => {
        const displayName = feature.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        featureList.push({ text: displayName, included: true });
      });
    }

    // Support
    if (features.support) {
      featureList.push({
        text: `${features.support.level.charAt(0).toUpperCase() + features.support.level.slice(1)} support`,
        included: true
      });
    }

    return featureList;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading pricing...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Unlock more features with Big Snuggles Premium
          </p>

          {/* Monthly/Yearly Toggle */}
          <div className="inline-flex items-center gap-4 bg-white rounded-full p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                interval === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                interval === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <Badge className="ml-2 bg-green-100 text-green-800 border-0">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier) => {
            const features = renderFeatureList(tier.features);
            const isPopular = tier.tier === 'premium';
            const price = getPrice(tier);
            const savings = getSavings(tier);

            return (
              <Card
                key={tier.tier}
                className={`relative ${getTierColor(tier.tier)} ${
                  isPopular ? 'ring-2 ring-amber-400 scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-3">
                    {getTierIcon(tier.tier)}
                  </div>
                  <CardTitle className="text-2xl">{tier.display_name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>

                  <div className="mt-6">
                    {price === 0 ? (
                      <div className="text-4xl font-bold text-gray-900">Free</div>
                    ) : (
                      <div>
                        <div className="text-4xl font-bold text-gray-900">
                          ${price.toFixed(2)}
                          <span className="text-lg font-normal text-gray-600">/month</span>
                        </div>
                        {interval === 'yearly' && savings > 0 && (
                          <div className="text-sm text-green-600 mt-1">
                            Save ${savings}/year
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Features List */}
                  <ul className="space-y-3 mb-6">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => {
                      if (tier.tier === 'free') {
                        navigate('/signup');
                      } else {
                        handleUpgrade(tier.tier);
                      }
                    }}
                    disabled={creatingCheckout === tier.tier}
                    className={`w-full ${
                      tier.tier === 'premium'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                        : tier.tier === 'pro'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                        : 'bg-gray-800 hover:bg-gray-900'
                    }`}
                  >
                    {creatingCheckout === tier.tier ? (
                      'Creating checkout...'
                    ) : tier.tier === 'free' ? (
                      'Get Started'
                    ) : tier.tier === 'premium' && tier.features.trial_days ? (
                      `Start ${tier.features.trial_days}-Day Trial`
                    ) : (
                      'Upgrade Now'
                    )}
                  </Button>

                  {tier.tier === 'premium' && tier.features.trial_days && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                      No credit card required for trial
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens to my data if I downgrade?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Your data is never deleted. If you downgrade, older memories may be archived but can be restored if you upgrade again.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How does the 7-day trial work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Premium tier includes a 7-day free trial. You won't be charged until the trial ends. Cancel anytime during the trial at no cost.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I upgrade or downgrade later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Absolutely! You can change your plan at any time. Upgrades take effect immediately with prorated billing, and downgrades take effect at your next billing cycle.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
