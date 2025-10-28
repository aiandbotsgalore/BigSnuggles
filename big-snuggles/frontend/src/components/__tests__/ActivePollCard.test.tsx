/**
 * ActivePollCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivePollCard } from '../ActivePollCard';

describe('ActivePollCard', () => {
  const mockPoll = {
    id: 'poll-1',
    roomId: 'room-1',
    createdBy: 'user-1',
    pollType: 'topic_voting' as const,
    question: 'What should we talk about?',
    options: [
      { id: 'opt-1', text: 'AI Ethics', votes: 5, percentage: 50 },
      { id: 'opt-2', text: 'Quantum Computing', votes: 3, percentage: 30 },
      { id: 'opt-3', text: 'Space Exploration', votes: 2, percentage: 20 }
    ],
    status: 'active' as const,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    createdAt: new Date().toISOString(),
    totalVotes: 10
  };

  const mockOnVote = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnVote.mockClear();
    mockOnClose.mockClear();
  });

  it('should render poll question', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={false}
      />
    );

    expect(screen.getByText('What should we talk about?')).toBeInTheDocument();
  });

  it('should display all poll options', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={false}
      />
    );

    expect(screen.getByText('AI Ethics')).toBeInTheDocument();
    expect(screen.getByText('Quantum Computing')).toBeInTheDocument();
    expect(screen.getByText('Space Exploration')).toBeInTheDocument();
  });

  it('should show vote count', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={false}
      />
    );

    expect(screen.getByText(/10 votes/)).toBeInTheDocument();
  });

  it('should allow voting when not voted yet', async () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={false}
      />
    );

    const option1Button = screen.getByText('AI Ethics').closest('button');
    await userEvent.click(option1Button!);

    expect(mockOnVote).toHaveBeenCalledWith('poll-1', 'opt-1');
  });

  it('should not allow voting when already voted', async () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={true}
        myVote="opt-1"
      />
    );

    const option2Button = screen.getByText('Quantum Computing').closest('button');
    await userEvent.click(option2Button!);

    expect(mockOnVote).not.toHaveBeenCalled();
  });

  it('should highlight user\'s vote', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={true}
        myVote="opt-1"
      />
    );

    const option1Button = screen.getByText('AI Ethics').closest('button');
    expect(option1Button).toHaveClass('border-purple-500');
  });

  it('should show percentages after voting', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={true}
        myVote="opt-1"
      />
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('should show close button for host', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={false}
        isHost={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('should not show close button for non-host', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={false}
        isHost={false}
      />
    );

    expect(screen.queryByText('Close')).not.toBeInTheDocument();
  });

  it('should call onClose when close button clicked', async () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={false}
        isHost={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByText('Close');
    await userEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledWith('poll-1');
  });

  it('should display countdown timer', () => {
    const futureTime = new Date(Date.now() + 90000); // 1.5 minutes from now
    const pollWithTimer = { ...mockPoll, expiresAt: futureTime.toISOString() };

    render(
      <ActivePollCard
        poll={pollWithTimer}
        onVote={mockOnVote}
        hasVoted={false}
      />
    );

    // Timer should show something like "1m 30s"
    const timerElement = screen.getByText(/\d+m \d+s|\d+s/);
    expect(timerElement).toBeInTheDocument();
  });

  it('should show different badge colors for different poll types', () => {
    const pollTypes = [
      { type: 'topic_voting' as const, label: 'Topic Vote' },
      { type: 'personality_mode' as const, label: 'Personality Mode' },
      { type: 'audience_question' as const, label: 'Question' },
      { type: 'quick_reaction' as const, label: 'Quick Poll' }
    ];

    pollTypes.forEach(({ type, label }) => {
      const { unmount } = render(
        <ActivePollCard
          poll={{ ...mockPoll, pollType: type }}
          onVote={mockOnVote}
          hasVoted={false}
        />
      );

      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it('should show help text when not voted', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={false}
      />
    );

    expect(screen.getByText('Click an option to vote')).toBeInTheDocument();
  });

  it('should show confirmation message after voting', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={true}
        myVote="opt-1"
      />
    );

    expect(screen.getByText(/You voted! Results update in real-time/)).toBeInTheDocument();
  });

  it('should highlight leading option after voting', () => {
    render(
      <ActivePollCard
        poll={mockPoll}
        onVote={mockOnVote}
        hasVoted={true}
        myVote="opt-1"
      />
    );

    // AI Ethics has most votes (5), should have TrendingUp icon
    const aiEthicsOption = screen.getByText('AI Ethics').closest('button');
    expect(aiEthicsOption?.querySelector('[class*="TrendingUp"]')).toBeInTheDocument();
  });

  it('should calculate percentages when not provided', () => {
    const pollWithoutPercentages = {
      ...mockPoll,
      options: [
        { id: 'opt-1', text: 'Option 1', votes: 7 },
        { id: 'opt-2', text: 'Option 2', votes: 3 }
      ],
      totalVotes: 10
    };

    render(
      <ActivePollCard
        poll={pollWithoutPercentages}
        onVote={mockOnVote}
        hasVoted={true}
        myVote="opt-1"
      />
    );

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('should handle zero votes gracefully', () => {
    const pollWithZeroVotes = {
      ...mockPoll,
      options: [
        { id: 'opt-1', text: 'Option 1', votes: 0 },
        { id: 'opt-2', text: 'Option 2', votes: 0 }
      ],
      totalVotes: 0
    };

    render(
      <ActivePollCard
        poll={pollWithZeroVotes}
        onVote={mockOnVote}
        hasVoted={false}
      />
    );

    expect(screen.getByText('0 votes')).toBeInTheDocument();
  });
});
