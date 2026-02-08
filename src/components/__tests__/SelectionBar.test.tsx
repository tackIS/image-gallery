import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useImageStore } from '../../store/imageStore';
import { makeGroup } from '../../test-utils';
import SelectionBar from '../SelectionBar';

vi.mock('../../utils/tauri-commands', () => ({
  addImagesToGroup: vi.fn().mockResolvedValue(undefined),
  removeImagesFromGroup: vi.fn().mockResolvedValue(undefined),
  getAllGroups: vi.fn().mockResolvedValue([]),
  getGroupImages: vi.fn().mockResolvedValue([]),
}));

describe('SelectionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useImageStore.getState().reset();
    useImageStore.setState({
      selectedImageIds: [],
      isSelectionMode: false,
      groups: [],
      selectedGroupId: null,
    });
  });

  it('renders null when selectedCount is 0', () => {
    const { container } = render(<SelectionBar />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "N selected" when images are selected', () => {
    useImageStore.setState({ selectedImageIds: [1, 2, 3] });
    render(<SelectionBar />);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('Toggle All button calls toggleSelectAll', () => {
    const toggleSelectAllSpy = vi.fn();
    useImageStore.setState({
      selectedImageIds: [1],
      toggleSelectAll: toggleSelectAllSpy,
    });
    render(<SelectionBar />);
    fireEvent.click(screen.getByText('Toggle All'));
    expect(toggleSelectAllSpy).toHaveBeenCalled();
  });

  it('Close button calls clearSelection and toggleSelectionMode', () => {
    const clearSelectionSpy = vi.fn();
    const toggleSelectionModeSpy = vi.fn();
    useImageStore.setState({
      selectedImageIds: [1],
      clearSelection: clearSelectionSpy,
      toggleSelectionMode: toggleSelectionModeSpy,
    });
    render(<SelectionBar />);
    fireEvent.click(screen.getByLabelText('Close selection mode'));
    expect(clearSelectionSpy).toHaveBeenCalled();
    expect(toggleSelectionModeSpy).toHaveBeenCalled();
  });

  it('Add to Group button is disabled when groups is empty', () => {
    useImageStore.setState({ selectedImageIds: [1], groups: [] });
    render(<SelectionBar />);
    const addBtn = screen.getByText('Add to Group').closest('button')!;
    expect(addBtn).toBeDisabled();
  });

  it('Add to Group button is enabled when groups exist', () => {
    useImageStore.setState({
      selectedImageIds: [1],
      groups: [makeGroup({ id: 1, name: 'Group A' })],
    });
    render(<SelectionBar />);
    const addBtn = screen.getByText('Add to Group').closest('button')!;
    expect(addBtn).not.toBeDisabled();
  });

  it('shows "Remove from Group" button when selectedGroupId is set', () => {
    useImageStore.setState({
      selectedImageIds: [1],
      selectedGroupId: 5,
    });
    render(<SelectionBar />);
    expect(screen.getByText('Remove from Group')).toBeInTheDocument();
  });

  it('does not show "Remove from Group" when selectedGroupId is null', () => {
    useImageStore.setState({
      selectedImageIds: [1],
      selectedGroupId: null,
    });
    render(<SelectionBar />);
    expect(screen.queryByText('Remove from Group')).not.toBeInTheDocument();
  });
});
