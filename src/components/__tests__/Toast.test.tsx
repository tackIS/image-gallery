import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useImageStore } from '../../store/imageStore';
import Toast from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useImageStore.getState().reset();
    // Clear any toasts
    useImageStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders null when toasts is empty', () => {
    const { container } = render(<Toast />);
    expect(container.innerHTML).toBe('');
  });

  it('renders success toast with green styling', () => {
    useImageStore.setState({
      toasts: [{ id: 'toast-1', message: 'Success!', type: 'success' }],
    });
    render(<Toast />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
    const toastEl = screen.getByText('Success!').closest('div[class*="bg-green"]');
    expect(toastEl).toBeInTheDocument();
  });

  it('renders error toast with red styling', () => {
    useImageStore.setState({
      toasts: [{ id: 'toast-2', message: 'Error!', type: 'error' }],
    });
    render(<Toast />);
    expect(screen.getByText('Error!')).toBeInTheDocument();
    const toastEl = screen.getByText('Error!').closest('div[class*="bg-red"]');
    expect(toastEl).toBeInTheDocument();
  });

  it('renders info toast with blue styling', () => {
    useImageStore.setState({
      toasts: [{ id: 'toast-3', message: 'Info!', type: 'info' }],
    });
    render(<Toast />);
    expect(screen.getByText('Info!')).toBeInTheDocument();
    const toastEl = screen.getByText('Info!').closest('div[class*="bg-blue"]');
    expect(toastEl).toBeInTheDocument();
  });

  it('close button calls removeToast', () => {
    const removeToastSpy = vi.fn();
    useImageStore.setState({
      toasts: [{ id: 'toast-4', message: 'Dismiss me', type: 'success' }],
      removeToast: removeToastSpy,
    });
    render(<Toast />);
    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);
    expect(removeToastSpy).toHaveBeenCalledWith('toast-4');
  });
});
