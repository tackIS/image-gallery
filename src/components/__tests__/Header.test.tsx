import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useImageStore } from '../../store/imageStore';
import { makeImage } from '../../test-utils';
import Header from '../Header';

vi.mock('../../utils/tauri-commands', () => ({
  checkFFmpegAvailable: vi.fn().mockResolvedValue('ffmpeg available'),
}));

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light' as const,
    setTheme: mockSetTheme,
    resolvedTheme: 'light' as const,
  }),
}));

vi.mock('../header/SearchBar', () => ({
  default: () => <div data-testid="search-bar">SearchBar</div>,
}));

vi.mock('../header/SortControls', () => ({
  default: () => <div data-testid="sort-controls">SortControls</div>,
}));

vi.mock('../header/FilterPanel', () => ({
  default: () => <div data-testid="filter-panel">FilterPanel</div>,
}));

vi.mock('../header/ViewModeToggle', () => ({
  default: () => <div data-testid="view-mode-toggle">ViewModeToggle</div>,
}));

vi.mock('../SettingsModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="settings-modal">
      <button onClick={onClose}>Close Settings</button>
    </div>
  ),
}));

const mockSetTheme = vi.fn();

describe('Header', () => {
  const onToggleSidebar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useImageStore.getState().reset();
  });

  it('renders "Image Gallery" title', () => {
    render(<Header isSidebarOpen={true} onToggleSidebar={onToggleSidebar} />);
    expect(screen.getByText('Image Gallery')).toBeInTheDocument();
  });

  it('shows image/video counts when images exist', () => {
    const images = [
      makeImage({ id: 1, file_type: 'image' }),
      makeImage({ id: 2, file_type: 'image' }),
      makeImage({ id: 3, file_type: 'video' }),
    ];
    useImageStore.setState({ images });
    render(<Header isSidebarOpen={true} onToggleSidebar={onToggleSidebar} />);
    expect(screen.getByText('2 images, 1 videos')).toBeInTheDocument();
  });

  it('theme toggle button calls setTheme', () => {
    render(<Header isSidebarOpen={true} onToggleSidebar={onToggleSidebar} />);
    const themeBtn = screen.getByLabelText(/Current theme/);
    fireEvent.click(themeBtn);
    expect(mockSetTheme).toHaveBeenCalled();
  });

  it('selection mode button shows when images exist', () => {
    useImageStore.setState({ images: [makeImage()] });
    render(<Header isSidebarOpen={true} onToggleSidebar={onToggleSidebar} />);
    expect(screen.getByLabelText('Enter selection mode')).toBeInTheDocument();
  });

  it('selection mode button calls toggleSelectionMode', () => {
    const toggleSpy = vi.fn();
    useImageStore.setState({
      images: [makeImage()],
      toggleSelectionMode: toggleSpy,
    });
    render(<Header isSidebarOpen={true} onToggleSidebar={onToggleSidebar} />);
    fireEvent.click(screen.getByLabelText('Enter selection mode'));
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('sidebar toggle button calls onToggleSidebar', () => {
    render(<Header isSidebarOpen={true} onToggleSidebar={onToggleSidebar} />);
    fireEvent.click(screen.getByLabelText('Close sidebar'));
    expect(onToggleSidebar).toHaveBeenCalled();
  });
});
