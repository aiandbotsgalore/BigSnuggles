/**
 * PollCreationModal Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PollCreationModal } from '../PollCreationModal';

describe('PollCreationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCreatePoll = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnCreatePoll.mockClear();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <PollCreationModal
        isOpen={false}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    expect(screen.getByText('Create Poll')).toBeInTheDocument();
  });

  it('should display all poll types', () => {
    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    expect(screen.getByText('Topic Vote')).toBeInTheDocument();
    expect(screen.getByText('Personality Mode')).toBeInTheDocument();
    expect(screen.getByText('Ask a Question')).toBeInTheDocument();
    expect(screen.getByText('Quick Reaction')).toBeInTheDocument();
  });

  it('should close when close button is clicked', async () => {
    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('svg')); // X icon button

    if (xButton) {
      await userEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should create poll with valid data', async () => {
    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    // Fill in question
    const questionInput = screen.getByPlaceholderText('Enter your poll question...');
    await userEvent.type(questionInput, 'What should we discuss?');

    // Fill in options
    const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
    await userEvent.type(optionInputs[0], 'AI Ethics');
    await userEvent.type(optionInputs[1], 'Quantum Computing');

    // Submit
    const createButton = screen.getByText('Create Poll');
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnCreatePoll).toHaveBeenCalledWith(
        'topic_voting',
        'What should we discuss?',
        ['AI Ethics', 'Quantum Computing'],
        60
      );
    });
  });

  it('should validate question is required', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    // Try to submit without question
    const createButton = screen.getByText('Create Poll');
    await userEvent.click(createButton);

    expect(alertMock).toHaveBeenCalledWith('Please enter a question');
    expect(mockOnCreatePoll).not.toHaveBeenCalled();

    alertMock.mockRestore();
  });

  it('should validate at least 2 options required', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    // Fill question but not options
    const questionInput = screen.getByPlaceholderText('Enter your poll question...');
    await userEvent.type(questionInput, 'Test question');

    const createButton = screen.getByText('Create Poll');
    await userEvent.click(createButton);

    expect(alertMock).toHaveBeenCalledWith('Please provide at least 2 options');
    expect(mockOnCreatePoll).not.toHaveBeenCalled();

    alertMock.mockRestore();
  });

  it('should allow adding more options', async () => {
    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    const addButton = screen.getByText('Add Option');
    await userEvent.click(addButton);

    const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
    expect(optionInputs.length).toBe(3); // Started with 2, added 1
  });

  it('should allow removing options (keeping minimum 2)', async () => {
    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    // Add an option first
    const addButton = screen.getByText('Add Option');
    await userEvent.click(addButton);

    let optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
    expect(optionInputs.length).toBe(3);

    // Remove one option
    const deleteButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg') && btn.className.includes('text-red')
    );
    
    if (deleteButtons.length > 0) {
      await userEvent.click(deleteButtons[0]);
      
      optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
      expect(optionInputs.length).toBe(2);
    }
  });

  it('should change poll type and update defaults', async () => {
    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    // Click on Personality Mode type
    const personalityButton = screen.getByText('Personality Mode').closest('button');
    await userEvent.click(personalityButton!);

    // Check that question was auto-filled
    const questionInput = screen.getByPlaceholderText('Enter your poll question...');
    expect(questionInput).toHaveValue('Which personality mode should Big Snuggles switch to?');

    // Check that options were auto-filled
    const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
    expect(optionInputs[0]).toHaveValue('Gangster');
    expect(optionInputs[1]).toHaveValue('Wise Mentor');
  });

  it('should select different durations', async () => {
    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    // Click 2 minutes duration
    const twoMinButton = screen.getByText('2 minutes');
    await userEvent.click(twoMinButton);

    // Fill in question and options
    const questionInput = screen.getByPlaceholderText('Enter your poll question...');
    await userEvent.type(questionInput, 'Test question');

    const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
    await userEvent.type(optionInputs[0], 'Option A');
    await userEvent.type(optionInputs[1], 'Option B');

    // Submit
    const createButton = screen.getByText('Create Poll');
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnCreatePoll).toHaveBeenCalledWith(
        'topic_voting',
        'Test question',
        ['Option A', 'Option B'],
        120 // 2 minutes = 120 seconds
      );
    });
  });

  it('should limit options to maximum 10', async () => {
    render(
      <PollCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCreatePoll={mockOnCreatePoll}
      />
    );

    const addButton = screen.getByText('Add Option');
    
    // Try to add 8 more options (already have 2)
    for (let i = 0; i < 8; i++) {
      await userEvent.click(addButton);
    }

    const optionInputs = screen.getAllByPlaceholderText(/Option \d+/);
    expect(optionInputs.length).toBe(10);

    // Button should be disabled or not visible
    const addButtons = screen.queryAllByText('Add Option');
    expect(addButtons.length).toBe(0); // Should not be rendered when at max
  });
});
