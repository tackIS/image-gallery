import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renders "No Media Files Found" heading', () => {
    render(<EmptyState />);
    expect(screen.getByText('No Media Files Found')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<EmptyState />);
    expect(
      screen.getByText('Add a directory from the sidebar to start browsing images and videos')
    ).toBeInTheDocument();
  });
});
