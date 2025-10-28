/**
 * Poll Creation Modal
 * 
 * Modal dialog for creating polls in rooms
 */

import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface PollCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (pollType: string, question: string, options: string[], durationSeconds: number) => void;
}

const POLL_TYPES = [
  { value: 'topic_voting', label: 'Topic Vote', description: 'Let audience choose conversation topics' },
  { value: 'personality_mode', label: 'Personality Mode', description: 'Switch AI personality mode' },
  { value: 'audience_question', label: 'Ask a Question', description: 'Audience submits questions' },
  { value: 'quick_reaction', label: 'Quick Reaction', description: 'Fast yes/no or emoji reactions' }
];

const PERSONALITY_MODES = [
  'Gangster',
  'Wise Mentor',
  'Comedy Roaster',
  'Conspiracy Theorist',
  'Motivational Speaker'
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' }
];

export function PollCreationModal({ isOpen, onClose, onCreatePoll }: PollCreationModalProps) {
  const [pollType, setPollType] = useState('topic_voting');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [duration, setDuration] = useState(60);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!question.trim()) {
      alert('Please enter a question');
      return;
    }

    const validOptions = options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert('Please provide at least 2 options');
      return;
    }

    // Create poll
    onCreatePoll(pollType, question.trim(), validOptions, duration);

    // Reset and close
    setPollType('topic_voting');
    setQuestion('');
    setOptions(['', '']);
    setDuration(60);
    onClose();
  };

  const handlePollTypeChange = (type: string) => {
    setPollType(type);

    // Set default question and options based on type
    if (type === 'personality_mode') {
      setQuestion('Which personality mode should Big Snuggles switch to?');
      setOptions(PERSONALITY_MODES);
    } else if (type === 'quick_reaction') {
      setQuestion('Quick poll:');
      setOptions(['👍 Yes', '👎 No', '🤷 Maybe']);
    } else if (type === 'topic_voting') {
      setQuestion('What should we talk about next?');
      setOptions(['', '']);
    } else {
      setQuestion('');
      setOptions(['', '']);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h2 className="text-2xl font-bold text-white">Create Poll</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Poll Type */}
          <div className="space-y-2">
            <Label className="text-white">Poll Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {POLL_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handlePollTypeChange(type.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    pollType === type.value
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50'
                  }`}
                >
                  <div className="font-semibold text-white">{type.label}</div>
                  <div className="text-sm text-gray-400 mt-1">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question" className="text-white">Question</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your poll question..."
              className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-white">Options</Label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                    required
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      className="border-red-500/50 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddOption}
                className="w-full border-purple-500/50 hover:bg-purple-500/20 text-purple-400"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-white">Duration</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDuration(opt.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    duration === opt.value
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-purple-500/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Create Poll
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
