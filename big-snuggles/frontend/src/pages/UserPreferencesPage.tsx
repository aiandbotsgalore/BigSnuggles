import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ApiClient } from '@/utils/apiClient';

interface UserPreferencesProps {
  className?: string;
}

interface PreferenceCategory {
  [key: string]: {
    [key: string]: {
      value: any;
      isConsented: boolean;
      consentDate: string | null;
    };
  };
}

export default function UserPreferences({ className = '' }: UserPreferencesProps) {
  const [preferences, setPreferences] = useState<PreferenceCategory>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.getUserPreferences();
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setMessage('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (category: string, key: string, value: any, consented: boolean = false) => {
    try {
      setSaving(true);
      
      // Update local state immediately for better UX
      setPreferences(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: {
            value,
            isConsented: consented,
            consentDate: consented ? new Date().toISOString() : null
          }
        }
      }));

      const response = await ApiClient.setConsent(category, key, consented, value);
      if (response.success) {
        setMessage('Preference updated successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
      setMessage('Failed to update preference');
      // Reload to restore previous state on error
      await loadPreferences();
    } finally {
      setSaving(false);
    }
  };

  const renderMemoryRetentionSection = () => {
    const retentionPrefs = preferences.memory_retention || {};
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Memory & Data Retention</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Default Retention Period</Label>
              <p className="text-sm text-muted-foreground">How long to keep conversation memories</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={retentionPrefs.default_retention_days?.value || 365}
                onChange={(e) => updatePreference('memory_retention', 'default_retention_days', parseInt(e.target.value))}
                className="w-20"
                disabled={saving}
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-cleanup Expired Memories</Label>
              <p className="text-sm text-muted-foreground">Automatically remove memories past their expiration date</p>
            </div>
            <Button
              variant={retentionPrefs.auto_cleanup?.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updatePreference('memory_retention', 'auto_cleanup', !retentionPrefs.auto_cleanup?.value, true)}
              disabled={saving}
            >
              {retentionPrefs.auto_cleanup?.value ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderContentFilteringSection = () => {
    const filteringPrefs = preferences.content_filtering || {};
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Content Filtering</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Profanity Sensitivity</Label>
              <p className="text-sm text-muted-foreground">Adjust content filtering for comfort level</p>
            </div>
            <select
              value={filteringPrefs.profanity_sensitivity?.value || 'medium'}
              onChange={(e) => updatePreference('content_filtering', 'profanity_sensitivity', e.target.value, true)}
              className="px-3 py-1 border rounded-md"
              disabled={saving}
            >
              <option value="strict">Strict - Filter all mature content</option>
              <option value="medium">Medium - Filter inappropriate content</option>
              <option value="relaxed">Relaxed - Minimal filtering</option>
              <option value="off">Off - No content filtering</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Adaptive Filtering</Label>
              <p className="text-sm text-muted-foreground">Learn your preferences over time</p>
            </div>
            <Button
              variant={filteringPrefs.adaptive_filtering?.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updatePreference('content_filtering', 'adaptive_filtering', !filteringPrefs.adaptive_filtering?.value, true)}
              disabled={saving}
            >
              {filteringPrefs.adaptive_filtering?.value ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPersonalityAdaptationSection = () => {
    const adaptationPrefs = preferences.personality_adaptation || {};
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Personality Adaptation</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Learn from Conversations</Label>
              <p className="text-sm text-muted-foreground">Allow personality to adapt based on your interactions</p>
            </div>
            <Button
              variant={adaptationPrefs.allow_learn_from_conversations?.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updatePreference('personality_adaptation', 'allow_learn_from_conversations', !adaptationPrefs.allow_learn_from_conversations?.value, true)}
              disabled={saving}
            >
              {adaptationPrefs.allow_learn_from_conversations?.value ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Adaptation Speed</Label>
              <p className="text-sm text-muted-foreground">How quickly personality adapts to your preferences</p>
            </div>
            <select
              value={adaptationPrefs.adaptation_speed?.value || 'medium'}
              onChange={(e) => updatePreference('personality_adaptation', 'adaptation_speed', e.target.value, true)}
              className="px-3 py-1 border rounded-md"
              disabled={saving}
            >
              <option value="slow">Slow - Gradual adaptation</option>
              <option value="medium">Medium - Balanced adaptation</option>
              <option value="fast">Fast - Quick adaptation</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Privacy & Preferences</h1>
        <p className="text-muted-foreground mt-2">
          Manage your privacy settings and customize your AI experience
        </p>
      </div>

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          {message}
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Memory & Data Retention</CardTitle>
            <CardDescription>
              Control how long your conversation data is stored and when it's automatically cleaned up
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderMemoryRetentionSection()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Filtering</CardTitle>
            <CardDescription>
              Adjust content filtering settings to match your comfort level and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContentFilteringSection()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personality Adaptation</CardTitle>
            <CardDescription>
              Configure how Big Snuggles learns and adapts to your interaction patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderPersonalityAdaptationSection()}
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button onClick={loadPreferences} disabled={loading || saving}>
          Refresh Preferences
        </Button>
      </div>
    </div>
  );
}