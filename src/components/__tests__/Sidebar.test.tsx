import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { useImageStore } from '../../store/imageStore';
import { makeGroup, renderWithRouter } from '../../test-utils';
import Sidebar from '../Sidebar';

vi.mock('../../utils/tauri-commands', () => ({
  createGroup: vi.fn().mockResolvedValue(undefined),
  getAllGroups: vi.fn().mockResolvedValue([]),
  updateGroup: vi.fn().mockResolvedValue(undefined),
  deleteGroup: vi.fn().mockResolvedValue(undefined),
  getAllImages: vi.fn().mockResolvedValue([]),
}));

vi.mock('../GroupItem', () => ({
  default: ({ group, onClick, onEdit, onDelete }: {
    group: { id: number; name: string };
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }) => (
    <div data-testid={`group-item-${group.id}`}>
      <button onClick={onClick}>{group.name}</button>
      <button onClick={onEdit} data-testid={`edit-${group.id}`}>Edit</button>
      <button onClick={onDelete} data-testid={`delete-${group.id}`}>Delete</button>
    </div>
  ),
}));

vi.mock('../GroupModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="group-modal">
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

vi.mock('../directory/DirectoryManager', () => ({
  default: () => <div data-testid="directory-manager">DirectoryManager</div>,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useImageStore.getState().reset();
    useImageStore.setState({
      groups: [],
      isSidebarCollapsed: false,
      selectedGroupId: null,
      selectedDirectoryId: null,
    });
  });

  it('renders null when isOpen is false', () => {
    const { container } = renderWithRouter(<Sidebar isOpen={false} />);
    // Should not render the aside
    expect(container.querySelector('aside')).not.toBeInTheDocument();
  });

  it('renders "All Images" button when open', () => {
    renderWithRouter(<Sidebar isOpen={true} />);
    expect(screen.getByText('All Images')).toBeInTheDocument();
  });

  it('renders group list when groups exist', () => {
    useImageStore.setState({
      groups: [
        makeGroup({ id: 1, name: 'Landscapes' }),
        makeGroup({ id: 2, name: 'Portraits' }),
      ],
    });
    renderWithRouter(<Sidebar isOpen={true} />);
    expect(screen.getByText('Landscapes')).toBeInTheDocument();
    expect(screen.getByText('Portraits')).toBeInTheDocument();
  });

  it('"New Group" button click shows group modal', () => {
    renderWithRouter(<Sidebar isOpen={true} />);
    fireEvent.click(screen.getByText('New Group'));
    expect(screen.getByTestId('group-modal')).toBeInTheDocument();
  });

  it('collapse/expand toggle calls toggleSidebarCollapsed', () => {
    const toggleSpy = vi.fn();
    useImageStore.setState({ toggleSidebarCollapsed: toggleSpy });
    renderWithRouter(<Sidebar isOpen={true} />);
    fireEvent.click(screen.getByLabelText('Collapse sidebar'));
    expect(toggleSpy).toHaveBeenCalled();
  });
});
