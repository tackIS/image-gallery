import { useState } from 'react';
import { Images, Plus } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import {
  createGroup,
  getAllGroups,
  updateGroup,
  deleteGroup,
  getGroupImages,
} from '../utils/tauri-commands';
import GroupItem from './GroupItem';
import GroupModal from './GroupModal';
import type { GroupData, CreateGroupInput, UpdateGroupInput } from '../types/image';

interface SidebarProps {
  /** サイドバーが開いているかどうか */
  isOpen: boolean;
}

/**
 * サイドバーコンポーネント
 * グループ一覧とフィルタリングを管理します
 */
export default function Sidebar({ isOpen }: SidebarProps) {
  const {
    groups,
    setGroups,
    addGroup,
    updateGroup: updateGroupInStore,
    removeGroup,
    selectedGroupId,
    setSelectedGroupId,
    setGroupFilteredImageIds,
    showToast,
  } = useImageStore();

  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateGroup = async (input: CreateGroupInput | UpdateGroupInput) => {
    if ('id' in input) {
      // 編集モード
      await updateGroup(input);
      const updatedGroups = await getAllGroups();
      setGroups(updatedGroups);
      updateGroupInStore(input.id, input);
    } else {
      // 作成モード
      const groupId = await createGroup(input);
      const updatedGroups = await getAllGroups();
      setGroups(updatedGroups);

      // 新しく作成されたグループを取得
      const newGroup = updatedGroups.find(g => g.id === groupId);
      if (newGroup) {
        addGroup(newGroup);
      }
    }
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
      removeGroup(groupId);

      // 削除したグループが選択されていた場合、選択を解除してフィルターをクリア
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
    setSelectedGroupId(null);
    setGroupFilteredImageIds([]);
  };

  const handleSelectGroup = async (groupId: number) => {
    try {
      setSelectedGroupId(groupId);
      const imageIds = await getGroupImages(groupId);
      setGroupFilteredImageIds(imageIds);
    } catch (err) {
      console.error('Failed to get group images:', err);
      setSelectedGroupId(null);
      setGroupFilteredImageIds([]);
      showToast('Failed to load group images', 'error');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Groups</h2>
            <button
              onClick={() => setShowModal(true)}
              className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              aria-label="Create new group"
              title="Create new group"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* All Images ボタン */}
          <button
            onClick={handleSelectAllImages}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              selectedGroupId === null
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Images size={18} />
            <span className="text-sm font-medium">All Images</span>
          </button>
        </div>

        {/* グループリスト */}
        <div className="flex-1 overflow-y-auto p-2">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              <p>No groups yet</p>
              <p className="mt-1">Click + to create one</p>
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map((group) => (
                <GroupItem
                  key={group.id}
                  group={group}
                  isSelected={selectedGroupId === group.id}
                  onClick={() => handleSelectGroup(group.id)}
                  onEdit={() => handleEditGroup(group)}
                  onDelete={() => handleDeleteGroup(group.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* グループ作成/編集モーダル */}
      {showModal && (
        <GroupModal
          group={editingGroup}
          onClose={handleModalClose}
          onSave={handleCreateGroup}
        />
      )}

      {/* 削除中のローディング */}
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
