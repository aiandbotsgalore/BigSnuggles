/**
 * Poll History
 * 
 * Displays past poll results
 */

import React from 'react';
import { TrendingUp, Trophy } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes?: number;
  percentage?: number;
}

interface Poll {
  id: string;
  pollType: 'topic_voting' | 'personality_mode' | 'audience_question' | 'quick_reaction';
  question: string;
  options: PollOption[];
  status: 'active' | 'closed' | 'expired';
  createdAt: string;
  totalVotes?: number;
  winningOption?: string;
}

interface PollHistoryProps {
  polls: Poll[];
}

export function PollHistory({ polls }: PollHistoryProps) {
  if (polls.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No past polls yet</p>
      </div>
    );
  }

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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Poll History</h3>
      
      {polls.map((poll) => {
        const totalVotes = poll.totalVotes || poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
        const winningOption = poll.options.find(opt => opt.id === poll.winningOption) || 
                             poll.options.reduce((max, opt) => (opt.votes || 0) > (max.votes || 0) ? opt : max, poll.options[0]);

        return (
          <div
            key={poll.id}
            className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${pollTypeColors[poll.pollType]}`}>
                    {pollTypeLabels[poll.pollType]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(poll.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <h4 className="text-white font-medium">{poll.question}</h4>
              </div>
            </div>

            {/* Winner */}
            {winningOption && (
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-400">Winner</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">{winningOption.text}</span>
                  <span className="text-purple-400">
                    {winningOption.votes || 0} votes ({((winningOption.votes || 0) / Math.max(totalVotes, 1) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}

            {/* All results */}
            <div className="space-y-2">
              {poll.options.map((option, index) => {
                const percentage = totalVotes > 0 ? ((option.votes || 0) / totalVotes) * 100 : 0;
                const isWinner = option.id === winningOption?.id;

                return (
                  <div key={option.id || index} className="relative">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={isWinner ? 'text-white font-medium' : 'text-gray-400'}>
                        {option.text}
                      </span>
                      <span className="text-gray-500">{option.votes || 0}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isWinner ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-700'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs text-gray-500">
              Total votes: {totalVotes}
            </div>
          </div>
        );
      })}
    </div>
  );
}
