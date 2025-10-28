import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Lock, Sparkles, Crown, TrendingUp } from 'lucide-react';

interface PremiumGateProps {
  children: React.ReactNode;
  requiredTier: 'premium' | 'pro';
  featureName: string;
  featureDescription?: string;
  compact?: boolean;
}

export function PremiumGate({
  children,
  requiredTier,
  featureName,
  featureDescription,
  compact = false
}: PremiumGateProps) {
  const navigate = useNavigate();

  // This would normally check the user's actual tier from context/state
  // For now, we'll just render the locked state
  const userTier = 'free'; // TODO: Get from auth context
  const hasAccess = userTier === requiredTier || (requiredTier === 'premium' && userTier === 'pro');

  if (hasAccess) {
    return <>{children}</>;
  }

  const getTierIcon = () => {
    return requiredTier === 'pro' ? (
      <Crown className="w-6 h-6 text-purple-500" />
    ) : (
      <Sparkles className="w-6 h-6 text-amber-500" />
    );
  };

  const getTierBadge = () => {
    return requiredTier === 'pro' ? (
      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        Pro Only
      </Badge>
    ) : (
      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        Premium
      </Badge>
    );
  };

  if (compact) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center p-4">
            <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 mb-1">{featureName}</p>
            {getTierBadge()}
            <Button
              size="sm"
              onClick={() => navigate('/pricing')}
              className="mt-3 bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
        <div className="opacity-30 pointer-events-none">{children}</div>
      </div>
    );
  }

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-white">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">{getTierIcon()}</div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-gray-400" />
          <CardTitle>{featureName}</CardTitle>
        </div>
        {getTierBadge()}
        <CardDescription className="mt-3">
          {featureDescription || `This feature requires ${requiredTier} tier`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <Button
          onClick={() => navigate('/pricing')}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
        </Button>
        <p className="text-xs text-gray-500">
          Unlock this feature and many more
        </p>
      </CardContent>
    </Card>
  );
}

interface QuotaWarningProps {
  quotaType: string;
  used: number;
  limit: number;
  percentage: number;
  onDismiss?: () => void;
}

export function QuotaWarning({ quotaType, used, limit, percentage, onDismiss }: QuotaWarningProps) {
  const navigate = useNavigate();

  const isAtLimit = percentage >= 100;
  const isWarning = percentage >= 80 && percentage < 100;

  if (!isWarning && !isAtLimit) return null;

  return (
    <div
      className={`border-l-4 p-4 rounded-lg ${
        isAtLimit
          ? 'bg-red-50 border-red-500'
          : 'bg-orange-50 border-orange-500'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Lock className={`w-5 h-5 ${isAtLimit ? 'text-red-600' : 'text-orange-600'}`} />
            <h4 className={`font-medium ${isAtLimit ? 'text-red-900' : 'text-orange-900'}`}>
              {isAtLimit ? `${quotaType} Quota Reached` : `${quotaType} Quota Warning`}
            </h4>
          </div>
          <p className={`text-sm ${isAtLimit ? 'text-red-700' : 'text-orange-700'}`}>
            {isAtLimit
              ? `You've reached your monthly limit of ${limit} ${quotaType.toLowerCase()}. Upgrade to continue.`
              : `You've used ${used} of ${limit} ${quotaType.toLowerCase()} this month (${Math.round(percentage)}%).`}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => navigate('/pricing')}
              className={
                isAtLimit
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }
            >
              Upgrade Plan
            </Button>
            {onDismiss && (
              <Button size="sm" variant="outline" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PremiumGate;
