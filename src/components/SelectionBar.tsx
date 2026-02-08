import { X, CheckSquare, FolderPlus, FolderMinus } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import { useState, useRef, useEffect } from 'react';
import type { GroupData } from '../types/image';
import { addImagesToGroup, removeImagesFromGroup, getAllGroups, getGroupImages } from '../utils/tauri-commands';

/**
 * 複数選択時のアクションバーコンポーネント
 * 画面下部中央に固定表示されます
 */
export default function SelectionBar() {
  const {
    selectedImageIds,
    toggleSelectAll,
    clearSelection,
    toggleSelectionMode,
    groups,
    selectedGroupId,
    setGroups,
    setGroupFilteredImageIds,
    showToast,
  } = useImageStore();

  const [showAddToGroupMenu, setShowAddToGroupMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // 選択数
  const selectedCount = selectedImageIds.length;

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddToGroupMenu(false);
      }
    };

    if (showAddToGroupMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddToGroupMenu]);

  const handleAddToGroup = async (groupId: number) => {
    try {
      await addImagesToGroup(selectedImageIds, groupId);

      // グループリストを更新（画像数を反映）
      const updatedGroups = await getAllGroups();
      setGroups(updatedGroups);

      // 現在フィルター中のグループに追加した場合、フィルターを更新
      if (selectedGroupId === groupId) {
        const updatedImageIds = await getGroupImages(groupId);
        setGroupFilteredImageIds(updatedImageIds);
      }

      setShowAddToGroupMenu(false);
      showToast(
        `${selectedCount} ${selectedCount === 1 ? 'image' : 'images'} added to group`,
        'success'
      );
    } catch (err) {
      console.error('Failed to add images to group:', err);
      showToast('Failed to add images to group', 'error');
    }
  };

  const handleRemoveFromGroup = async () => {
    if (!selectedGroupId) return;

    try {
      await removeImagesFromGroup(selectedImageIds, selectedGroupId);

      // グループリストを更新（画像数を反映）
      const updatedGroups = await getAllGroups();
      setGroups(updatedGroups);

      // グループフィルターを更新（削除した画像を除外）
      const updatedImageIds = await getGroupImages(selectedGroupId);
      setGroupFilteredImageIds(updatedImageIds);

      // 選択をクリア
      clearSelection();

      showToast(
        `${selectedCount} ${selectedCount === 1 ? 'image' : 'images'} removed from group`,
        'success'
      );
    } catch (err) {
      console.error('Failed to remove images from group:', err);
      showToast('Failed to remove images from group', 'error');
    }
  };

  const handleClose = () => {
    clearSelection();
    toggleSelectionMode();
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div role="toolbar" aria-label="選択操作" className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl px-4 py-3 flex items-center gap-4 z-50">
      {/* 選択数表示 */}
      <div className="flex items-center gap-2">
        <CheckSquare size={18} className="text-blue-500" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {selectedCount} selected
        </span>
      </div>

      {/* 区切り線 */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Toggle All ボタン */}
      <button
        onClick={toggleSelectAll}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        Toggle All
      </button>

      {/* Add to Group ボタン */}
      <div className="relative" ref={addMenuRef}>
        <button
          onClick={() => setShowAddToGroupMenu(!showAddToGroupMenu)}
          aria-expanded={showAddToGroupMenu}
          aria-haspopup="listbox"
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
            groups.length === 0
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          disabled={groups.length === 0}
        >
          <FolderPlus size={16} />
          <span>Add to Group</span>
        </button>

        {/* グループ選択ドロップダウン */}
        {showAddToGroupMenu && groups.length > 0 && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[200px] max-h-64 overflow-y-auto">
            {groups.map((group: GroupData) => (
              <button
                key={group.id}
                onClick={() => handleAddToGroup(group.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <span className="flex-1 truncate">{group.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({group.image_count})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Remove from Group ボタン（グループフィルター時のみ） */}
      {selectedGroupId && (
        <button
          onClick={handleRemoveFromGroup}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          <FolderMinus size={16} />
          <span>Remove from Group</span>
        </button>
      )}

      {/* 区切り線 */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* クローズボタン */}
      <button
        onClick={handleClose}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300"
        aria-label="Close selection mode"
        title="Close selection mode"
      >
        <X size={18} />
      </button>
    </div>
  );
}
