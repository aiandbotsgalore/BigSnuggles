/**
 * Story Feed Page - Phase 5
 * Interactive conversation feed with transcripts, highlights, search, and sentiment analysis
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  MessageSquare,
  Heart,
  Star,
  Calendar,
  BarChart3,
  Play,
  Download,
  Share,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useVoiceWebSocket } from '../hooks/useVoiceWebSocket';
import { getApiClient } from '../utils/apiClient';

const StoryFeedPage = () => {
  const { user } = useAuth();
  const { client } = useVoiceWebSocket();
  
  // State management
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [viewMode, setViewMode] = useState('feed'); // feed, highlights, search
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // API client
  const apiClient = useMemo(() => getApiClient(), []);

  // Load initial data
  useEffect(() => {
    loadTranscripts();
    loadStatistics();
  }, [user]);

  // Load transcripts
  const loadTranscripts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/transcripts?limit=50');
      if (response.success) {
        setTranscripts(response.data);
      }
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const response = await apiClient.get('/transcripts/statistics');
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // Search transcripts
  const searchTranscripts = async (query) => {
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      setViewMode('search');
      const response = await apiClient.post('/transcripts/search', {
        query: query.trim(),
        filters: {
          personalityMode: selectedPersonality !== 'all' ? selectedPersonality : null
        }
      });
      
      if (response.success) {
        setTranscripts(response.data);
      }
    } catch (error) {
      console.error('Error searching transcripts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate highlights for a transcript
  const generateHighlights = async (transcript) => {
    try {
      const response = await apiClient.post('/transcripts/generate-highlights', {
        messages: transcript.full_conversation
      });
      
      if (response.success) {
        setSelectedTranscript({
          ...transcript,
          highlights: response.data
        });
      }
    } catch (error) {
      console.error('Error generating highlights:', error);
    }
  };

  // Filter transcripts based on current filters
  const filteredTranscripts = useMemo(() => {
    let filtered = transcripts;

    // Personality filter
    if (selectedPersonality !== 'all') {
      filtered = filtered.filter(t => t.personality_mode === selectedPersonality);
    }

    // Sentiment filter
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(t => {
        const sentiment = t.sentiment_score || 0;
        switch (sentimentFilter) {
          case 'very_positive': return sentiment >= 0.6;
          case 'positive': return sentiment >= 0.2 && sentiment < 0.6;
          case 'neutral': return sentiment > -0.2 && sentiment < 0.2;
          case 'negative': return sentiment <= -0.2 && sentiment > -0.6;
          case 'very_negative': return sentiment <= -0.6;
          default: return true;
        }
      });
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(t => new Date(t.created_at) >= filterDate);
    }

    return filtered;
  }, [transcripts, selectedPersonality, sentimentFilter, dateFilter]);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // Get sentiment color
  const getSentimentColor = (score) => {
    if (score >= 0.6) return 'text-green-500';
    if (score >= 0.2) return 'text-blue-500';
    if (score > -0.2) return 'text-gray-500';
    if (score > -0.6) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get personality emoji
  const getPersonalityEmoji = (mode) => {
    const emojis = {
      late_night: '🌙',
      conspiracy_hour: '🕵️',
      gangster_mode: '💪',
      playful_snuggles: '🧸',
      wild_card: '🎲'
    };
    return emojis[mode] || '💬';
  };

  // Render statistics overview
  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Conversations</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalConversations}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalMessages}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Sentiment</p>
              <p className={`text-2xl font-bold ${getSentimentColor(statistics.averageSentiment)}`}>
                {statistics.averageSentiment > 0 ? '+' : ''}{statistics.averageSentiment.toFixed(2)}
              </p>
            </div>
            <Heart className="w-8 h-8 text-pink-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Time Spent</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.conversationDuration}m</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>
    );
  };

  // Render transcript card
  const renderTranscriptCard = (transcript) => {
    const messages = transcript.full_conversation;
    const previewText = messages.length > 0 
      ? messages[0].content.substring(0, 150) + '...'
      : 'No content available';

    return (
      <div 
        key={transcript.id} 
        className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedTranscript(transcript)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getPersonalityEmoji(transcript.personality_mode)}</span>
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {transcript.personality_mode?.replace('_', ' ')}
              </h3>
              <p className="text-sm text-gray-600">{formatTime(transcript.created_at)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <span className={`text-sm font-medium ${getSentimentColor(transcript.sentiment_score)}`}>
                {(transcript.sentiment_score || 0).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{transcript.message_count}</span>
            </div>
          </div>
        </div>
        
        <p className="text-gray-700 mb-4 line-clamp-3">{previewText}</p>
        
        {transcript.highlight_moments && transcript.highlight_moments.length > 0 && (
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-600">
              {transcript.highlight_moments.length} highlight{transcript.highlight_moments.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Render transcript detail modal
  const renderTranscriptDetail = () => {
    if (!selectedTranscript) return null;

    const messages = selectedTranscript.full_conversation || [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Conversation Details</h2>
              <button 
                onClick={() => setSelectedTranscript(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {new Date(selectedTranscript.created_at).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Duration: {selectedTranscript.duration_minutes} minutes • 
                {selectedTranscript.message_count} messages
              </p>
            </div>
            
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : 'bg-green-50 border-l-4 border-green-500'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                      message.role === 'user' ? 'bg-blue-500' : 'bg-green-500'
                    }`}>
                      {message.role === 'user' ? 'U' : 'AI'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 capitalize">{message.role}</p>
                      <p className="text-gray-700 mt-1">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Story Feed</h1>
          <p className="text-gray-600">Explore your conversations with Big Snuggles</p>
        </div>

        {/* Statistics Overview */}
        {renderStatistics()}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchTranscripts(searchQuery)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={() => {
                loadTranscripts();
                loadStatistics();
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Personality Mode</label>
                <select
                  value={selectedPersonality}
                  onChange={(e) => setSelectedPersonality(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Modes</option>
                  <option value="late_night">Late Night</option>
                  <option value="conspiracy_hour">Conspiracy Hour</option>
                  <option value="gangster_mode">Gangster Mode</option>
                  <option value="playful_snuggles">Playful Snuggles</option>
                  <option value="wild_card">Wild Card</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sentiment</label>
                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sentiments</option>
                  <option value="very_positive">Very Positive</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                  <option value="very_negative">Very Negative</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredTranscripts.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {viewMode === 'search' ? 'Search Results' : 'Your Conversations'}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredTranscripts.length})
                </span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredTranscripts.map(renderTranscriptCard)}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms or filters.' : 'Start a conversation to see it here!'}
            </p>
          </div>
        )}
      </div>

      {/* Transcript Detail Modal */}
      {renderTranscriptDetail()}
    </div>
  );
};

export default StoryFeedPage;