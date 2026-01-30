import { useState, useRef, useEffect } from 'react';
import { Folder, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useImageStore } from '../store/imageStore';
import type { GroupData } from '../types/image';

interface GroupItemProps {
  /** グループデータ */
  group: GroupData;
  /** 選択状態 */
  isSelected: boolean;
  /** クリック時のコールバック */
  onClick: () => void;
  /** 編集時のコールバック */
  onEdit: () => void;
  /** 削除時のコールバック */
  onDelete: () => void;
}

/**
 * グループアイテムコンポーネント
 * サイドバーに表示される各グループのリストアイテム
 */
export default function GroupItem({
  group,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: GroupItemProps) {
  const { images } = useImageStore();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 代表画像を取得
  const representativeImage = group.representative_image_id
    ? images.find((img) => img.id === group.representative_image_id)
    : null;

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // メニューを開く前に位置を計算
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const menuHeight = 100; // メニューの概算高さ（2項目）

      // 下部に十分なスペースがない場合は上方向に開く
      setMenuPosition(spaceBelow < menuHeight ? 'top' : 'bottom');
    }

    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete();
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
      }`}
    >
      {/* 代表画像サムネイルまたはアイコン */}
      {representativeImage ? (
        <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
          <img
            src={convertFileSrc(representativeImage.file_path)}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <>
          {/* カラーインジケーター */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: group.color }}
            aria-hidden="true"
          />
          {/* グループアイコン */}
          <Folder size={18} className="flex-shrink-0" />
        </>
      )}

      {/* グループ名 */}
      <span className="flex-1 text-sm font-medium truncate">{group.name}</span>

      {/* 画像数バッジ */}
      <span
        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
          isSelected
            ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
        }`}
      >
        {group.image_count}
      </span>

      {/* メニューボタン（ホバー時に表示） */}
      <div className="relative" ref={menuRef}>
        <button
          ref={buttonRef}
          onClick={handleMenuClick}
          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
            showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label="Group menu"
        >
          <MoreVertical size={16} />
        </button>

        {/* ドロップダウンメニュー */}
        {showMenu && (
          <div
            className={`absolute right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg py-1 z-10 min-w-[120px] ${
              menuPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
            }`}
          >
            <button
              onClick={handleEdit}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Edit2 size={14} />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
