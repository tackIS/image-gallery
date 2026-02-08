import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { makeGroup } from '../../test-utils';
import GroupModal from '../GroupModal';

describe('GroupModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create mode: shows "Create New Group" title', () => {
    render(<GroupModal onClose={onClose} onSave={onSave} />);
    expect(screen.getByText('Create New Group')).toBeInTheDocument();
  });

  it('edit mode: shows "Edit Group" title and existing values', () => {
    const group = makeGroup({ name: 'Vacation', description: 'Summer trip', color: '#22c55e' });
    render(<GroupModal group={group} onClose={onClose} onSave={onSave} />);
    expect(screen.getByText('Edit Group')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Vacation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Summer trip')).toBeInTheDocument();
  });

  it('validation: empty name shows error', async () => {
    render(<GroupModal onClose={onClose} onSave={onSave} />);
    const submitBtn = screen.getByText('Create');
    fireEvent.click(submitBtn);
    expect(await screen.findByText('Group name is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('input maxLength limits name to 100 characters', () => {
    render(<GroupModal onClose={onClose} onSave={onSave} />);
    const input = screen.getByPlaceholderText('Enter group name');
    expect(input.getAttribute('maxLength')).toBe('100');
  });

  it('color selection: clicking preset changes ring style', () => {
    render(<GroupModal onClose={onClose} onSave={onSave} />);
    // Green color button
    const greenBtn = screen.getByLabelText('Select Green color');
    fireEvent.click(greenBtn);
    expect(greenBtn.className).toContain('ring-4');
  });

  it('submit: calls onSave with correct input', async () => {
    render(<GroupModal onClose={onClose} onSave={onSave} />);
    const nameInput = screen.getByPlaceholderText('Enter group name');
    fireEvent.change(nameInput, { target: { value: 'My Group' } });

    const submitBtn = screen.getByText('Create');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Group' })
      );
    });
  });

  it('Escape key closes modal', () => {
    render(<GroupModal onClose={onClose} onSave={onSave} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel button closes modal', () => {
    render(<GroupModal onClose={onClose} onSave={onSave} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
