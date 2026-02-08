import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useImageStore } from '../../store/imageStore';
import { makeImage } from '../../test-utils';
import MediaCard from '../MediaCard';

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
}));

vi.mock('../../utils/tauri-commands', () => ({
  updateImageMetadata: vi.fn().mockResolvedValue(undefined),
  generateVideoThumbnail: vi.fn().mockResolvedValue('/tmp/thumb.jpg'),
}));

describe('MediaCard', () => {
  const onClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useImageStore.getState().reset();
    useImageStore.setState({
      isSelectionMode: false,
      selectedImageIds: [],
    });
  });

  it('renders image with convertFileSrc URL', () => {
    const media = makeImage({ file_name: 'photo.jpg', file_path: '/photos/photo.jpg' });
    render(<MediaCard media={media} onClick={onClick} />);
    const img = screen.getByAltText('photo.jpg');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('photo.jpg');
  });

  it('alt text equals file_name', () => {
    const media = makeImage({ file_name: 'test-image.png' });
    render(<MediaCard media={media} onClick={onClick} />);
    expect(screen.getByAltText('test-image.png')).toBeInTheDocument();
  });

  it('favorite button click toggles favorite', async () => {
    const media = makeImage({ id: 42, is_favorite: 0 });
    const toggleFavoriteSpy = vi.fn();
    useImageStore.setState({ toggleFavorite: toggleFavoriteSpy });

    render(<MediaCard media={media} onClick={onClick} />);
    const favButton = screen.getByLabelText('Add to favorites');
    fireEvent.click(favButton);
    expect(toggleFavoriteSpy).toHaveBeenCalledWith(42);
  });

  it('selection mode: card click toggles image selection', () => {
    const media = makeImage({ id: 7 });
    const toggleImageSelectionSpy = vi.fn();
    useImageStore.setState({
      isSelectionMode: true,
      selectedImageIds: [],
      toggleImageSelection: toggleImageSelectionSpy,
    });

    render(<MediaCard media={media} onClick={onClick} />);
    // Click the card (not favorite button)
    const card = screen.getByAltText('image.jpg').closest('div[class*="aspect-square"]')!;
    fireEvent.click(card);
    expect(toggleImageSelectionSpy).toHaveBeenCalledWith(7);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('normal mode: card click calls onClick', () => {
    const media = makeImage();
    render(<MediaCard media={media} onClick={onClick} />);
    const card = screen.getByAltText('image.jpg').closest('div[class*="aspect-square"]')!;
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalled();
  });

  it('error state: shows error UI on image load failure', () => {
    const media = makeImage({ file_name: 'broken.jpg' });
    render(<MediaCard media={media} onClick={onClick} />);
    const img = screen.getByAltText('broken.jpg');
    fireEvent.error(img);
    expect(screen.getByText('Image load error')).toBeInTheDocument();
  });

  it('video: shows Play icon overlay', () => {
    const media = makeImage({
      file_type: 'video',
      file_name: 'clip.mp4',
      file_path: '/videos/clip.mp4',
    });
    render(<MediaCard media={media} onClick={onClick} />);
    // Play icon overlay should be present (the bg-black/30 container)
    const overlay = document.querySelector('.bg-black\\/30');
    expect(overlay).toBeInTheDocument();
  });
});
