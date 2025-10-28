/**
 * Active Poll Card
 * 
 * Displays an active poll with voting options and real-time results
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Users, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

interface PollOption {
  id: string;
  text: string;
  votes?: number;
  percentage?: number;
}

interface Poll {
  id: string;
  roomId: string;
  createdBy: string;
  pollType: 'topic_voting' | 'personality_mode' | 'audience_question' | 'quick_reaction';
  question: string;
  options: PollOption[];
  status: 'active' | 'closed' | 'expired';
  expiresAt: string;
  createdAt: string;
  totalVotes?: number;
}

interface ActivePollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  hasVoted: boolean;
  myVote?: string;
  isHost?: boolean;
  onClose?: (pollId: string) => void;
}

export function ActivePollCard({ poll, onVote, hasVoted, myVote, isHost, onClose }: ActivePollCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(poll.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${remainingSeconds}s`);
      } else {
        setTimeRemaining(`${remainingSeconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [poll.expiresAt]);

  const handleVote = (optionId: string) => {
    if (!hasVoted) {
      onVote(poll.id, optionId);
    }
  };

  const totalVotes = poll.totalVotes || poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);

  // Calculate percentages if not provided
  const optionsWithPercentage = poll.options.map(opt => ({
    ...opt,
    percentage: opt.percentage ?? (totalVotes > 0 ? ((opt.votes || 0) / totalVotes) * 100 : 0)
  }));

  const pollTypeLabels = {
    topic_voting: 'Topic Vote',
    personality_mode: 'Personality Mode',
    audience_question: 'Question',
    quick_reaction: 'Quick Poll'
  };

  const pollTypeColors = {
    topic_voting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    personality_mode: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    audience_question: 'bg-green-500/20 text-green-400 border-green-500/30',
    quick_reaction: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border border-purple-500/30 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full border ${pollTypeColors[poll.pollType]}`}>
              {pollTypeLabels[poll.pollType]}
            </span>
            {poll.status === 'active' && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeRemaining}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">{poll.question}</h3>
        </div>
        {isHost && onClose && (
          <Button
            onClick={() => onClose(poll.id)}
            variant="outline"
            size="sm"
            className="border-red-500/50 hover:bg-red-500/20 text-red-400"
          >
            Close
          </Button>
        )}
      </div>

      {/* Poll Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </span>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {optionsWithPercentage.map((option, index) => {
          const isMyVote = hasVoted && myVote === option.id;
          const isLeading = option.votes === Math.max(...optionsWithPercentage.map(o => o.votes || 0)) && (option.votes || 0) > 0;

          return (
            <button
              key={option.id || index}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted}
              className={`w-full relative overflow-hidden rounded-lg border-2 transition-all ${
                hasVoted
                  ? isMyVote
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-gray-800/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50 hover:bg-purple-500/10 cursor-pointer'
              }`}
            >
              {/* Progress bar (shown after voting) */}
              {hasVoted && (
                <div
                  className={`absolute inset-0 transition-all duration-500 ${
                    isLeading ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30' : 'bg-gray-700/20'
                  }`}
                  style={{ width: `${option.percentage}%` }}
                />
              )}

              {/* Option content */}
              <div className="relative flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {isMyVote && (
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  )}
                  <span className="text-white font-medium">{option.text}</span>
                  {isLeading && hasVoted && (
                    <TrendingUp className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  )}
                </div>

                {hasVoted && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">{option.votes || 0}</span>
                    <span className="text-purple-400 font-semibold min-w-[3rem] text-right">
                      {option.percentage?.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      {!hasVoted && (
        <p className="mt-4 text-sm text-gray-500 text-center">
          Click an option to vote
        </p>
      )}
      {hasVoted && (
        <p className="mt-4 text-sm text-purple-400 text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          You voted! Results update in real-time
        </p>
      )}
    </div>
  );
}
