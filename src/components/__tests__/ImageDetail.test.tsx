import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useImageStore } from '../../store/imageStore';
import { makeImage } from '../../test-utils';
import ImageDetail from '../ImageDetail';

vi.mock('../../utils/tauri-commands', () => ({
  updateImageMetadata: vi.fn().mockResolvedValue(undefined),
  getAllImages: vi.fn().mockResolvedValue([]),
  getImageGroups: vi.fn().mockResolvedValue([]),
}));

vi.mock('../detail/ImageViewer', () => ({
  default: ({ fileName }: { fileName: string }) => (
    <div data-testid="image-viewer">{fileName}</div>
  ),
}));

vi.mock('../detail/MetadataPanel', () => ({
  default: ({ image }: { image: { file_name: string } }) => (
    <div data-testid="metadata-panel">{image.file_name}</div>
  ),
}));

vi.mock('../SlideshowControls', () => ({
  default: () => <div data-testid="slideshow-controls">SlideshowControls</div>,
}));

const sampleImages = [
  makeImage({ id: 1, file_name: 'first.jpg' }),
  makeImage({ id: 2, file_name: 'second.jpg' }),
  makeImage({ id: 3, file_name: 'third.jpg' }),
];

describe('ImageDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useImageStore.getState().reset();
    useImageStore.setState({
      images: sampleImages,
      selectedImageId: null,
      isSlideshowActive: false,
      slideshowInterval: 5,
      groups: [],
    });
  });

  it('renders null when selectedImageId is null', () => {
    const { container } = render(<ImageDetail />);
    expect(container.innerHTML).toBe('');
  });

  it('renders portal content when selectedImage exists', () => {
    useImageStore.setState({ selectedImageId: 1 });
    render(<ImageDetail />);
    expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-panel')).toBeInTheDocument();
  });

  it('Escape key clears selectedImageId', () => {
    const setSelectedImageIdSpy = vi.fn();
    useImageStore.setState({
      selectedImageId: 1,
      setSelectedImageId: setSelectedImageIdSpy,
    });
    render(<ImageDetail />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setSelectedImageIdSpy).toHaveBeenCalledWith(null);
  });

  it('ArrowLeft navigates to previous image', () => {
    const setSelectedImageIdSpy = vi.fn();
    useImageStore.setState({
      selectedImageId: 2,
      setSelectedImageId: setSelectedImageIdSpy,
    });
    render(<ImageDetail />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(setSelectedImageIdSpy).toHaveBeenCalledWith(1);
  });

  it('ArrowRight navigates to next image', () => {
    const setSelectedImageIdSpy = vi.fn();
    useImageStore.setState({
      selectedImageId: 2,
      setSelectedImageId: setSelectedImageIdSpy,
    });
    render(<ImageDetail />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(setSelectedImageIdSpy).toHaveBeenCalledWith(3);
  });

  it('slideshow: auto-advances after interval', () => {
    vi.useFakeTimers();
    const setSelectedImageIdSpy = vi.fn();
    useImageStore.setState({
      selectedImageId: 1,
      isSlideshowActive: true,
      slideshowInterval: 3,
      setSelectedImageId: setSelectedImageIdSpy,
    });
    render(<ImageDetail />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(setSelectedImageIdSpy).toHaveBeenCalledWith(2);
    vi.useRealTimers();
  });
});
