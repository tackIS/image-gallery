import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Images, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import {
  createGroup,
  getAllGroups,
  updateGroup,
  deleteGroup,
} from '../utils/tauri-commands';
import GroupItem from './GroupItem';
import GroupModal from './GroupModal';
import DirectoryManager from './directory/DirectoryManager';
import type { GroupData, CreateGroupInput, UpdateGroupInput } from '../types/image';

type SidebarProps = {
  isOpen: boolean;
};

export default function Sidebar({ isOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    groups,
    setGroups,
    selectedGroupId,
    setSelectedGroupId,
    setGroupFilteredImageIds,
    showToast,
    resetAllModes,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
  } = useImageStore();

  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOnGroupPage = location.pathname.startsWith('/group/');
  const currentGroupId = isOnGroupPage
    ? parseInt(location.pathname.split('/').pop() || '', 10)
    : null;

  const handleCreateGroup = async (input: CreateGroupInput | UpdateGroupInput) => {
    if ('id' in input) {
      await updateGroup(input);
    } else {
      await createGroup(input);
    }
    const updatedGroups = await getAllGroups();
    setGroups(updatedGroups);
  };

  const handleEditGroup = (group: GroupData) => {
    setEditingGroup(group);
    setShowModal(true);
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Are you sure you want to delete this group? Images will not be deleted.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteGroup(groupId);
      const updatedGroups = await getAllGroups();
      setGroups(updatedGroups);

      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
        setGroupFilteredImageIds([]);
      }

      showToast('Group deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete group:', err);
      showToast('Failed to delete group', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingGroup(null);
  };

  const handleSelectAllImages = () => {
    resetAllModes();
    navigate('/');
    setSelectedGroupId(null);
    setGroupFilteredImageIds([]);
  };

  const handleSelectGroup = (groupId: number) => {
    resetAllModes();
    navigate(`/group/${groupId}`);
  };

  if (!isOpen) {
    return null;
  }

  const collapsed = isSidebarCollapsed;

  return (
    <>
      <aside
        className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full transition-all duration-[--transition-slow] ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Collapse toggle */}
        <div className={`flex items-center border-b border-gray-200 dark:border-gray-700 ${collapsed ? 'justify-center p-2' : 'justify-between p-4'}`}>
          {!collapsed && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Groups</h2>
          )}
          <button
            onClick={toggleSidebarCollapsed}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 dark:text-gray-400"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Actions */}
        <div className={`border-b border-gray-200 dark:border-gray-700 ${collapsed ? 'p-2' : 'px-4 py-3'}`}>
          {/* All Images button */}
          <button
            onClick={handleSelectAllImages}
            className={`w-full flex items-center rounded-lg transition-colors ${
              !isOnGroupPage
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            } ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'}`}
            title="All Images"
          >
            <Images size={18} />
            {!collapsed && <span className="text-sm font-medium">All Images</span>}
          </button>

          {/* Create group button */}
          {!collapsed ? (
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              aria-label="Create new group"
              title="Create new group"
            >
              <Plus size={18} />
              <span className="text-sm">New Group</span>
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex justify-center p-2 mt-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              aria-label="Create new group"
              title="Create new group"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Directories section */}
        <div className={`border-b border-gray-200 dark:border-gray-700 ${collapsed ? 'p-2' : 'py-2'}`}>
          <DirectoryManager collapsed={collapsed} />
        </div>

        {/* Group list */}
        <div className="flex-1 overflow-y-auto p-2">
          {groups.length === 0 ? (
            !collapsed && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                <p>No groups yet</p>
                <p className="mt-1">Click + to create one</p>
              </div>
            )
          ) : (
            <div className="space-y-1">
              {groups.map((group) => (
                collapsed ? (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group.id)}
                    className={`w-full flex justify-center p-2 rounded-lg transition-colors ${
                      currentGroupId === group.id
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={`${group.name} (${group.image_count})`}
                  >
                    <div
                      className="w-5 h-5 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                  </button>
                ) : (
                  <GroupItem
                    key={group.id}
                    group={group}
                    isSelected={currentGroupId === group.id}
                    onClick={() => handleSelectGroup(group.id)}
                    onEdit={() => handleEditGroup(group)}
                    onDelete={() => handleDeleteGroup(group.id)}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </aside>

      {showModal && (
        <GroupModal
          group={editingGroup}
          onClose={handleModalClose}
          onSave={handleCreateGroup}
        />
      )}

      {isDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl">
            <p className="text-gray-900 dark:text-gray-100">Deleting group...</p>
          </div>
        </div>
      )}
    </>
  );
}
