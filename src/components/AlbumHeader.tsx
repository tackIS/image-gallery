import { useState } from 'react';
import { Edit2, Image as ImageIcon, Folder } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { GroupData, ImageData, CreateGroupInput, UpdateGroupInput } from '../types/image';
import { updateGroup } from '../utils/tauri-commands';
import GroupModal from './GroupModal';

type AlbumHeaderProps = {
  group: GroupData;
  representativeImage: ImageData | null;
  onSetRepresentativeImage: () => void;
  onGroupUpdated: () => void;
};

function AlbumHeader({ group, representativeImage, onSetRepresentativeImage, onGroupUpdated }: AlbumHeaderProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-6">
            {/* 代表画像サムネイル */}
            <div className="flex-shrink-0">
              {representativeImage ? (
                <div className="w-48 h-48 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600">
                  <img
                    src={convertFileSrc(representativeImage.file_path)}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <Folder size={64} className="text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>

            {/* グループ情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {group.name}
                </h1>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {group.image_count} {group.image_count === 1 ? 'image' : 'images'}
              </p>

              {group.description && (
                <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap">
                  {group.description}
                </p>
              )}

              {/* アクションボタン */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                  Edit Info
                </button>

                <button
                  onClick={onSetRepresentativeImage}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
                >
                  <ImageIcon size={16} />
                  Set Representative Image
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* グループ編集モーダル */}
      {isEditModalOpen && (
        <GroupModal
          group={group}
          onClose={() => setIsEditModalOpen(false)}
          onSave={async (input: CreateGroupInput | UpdateGroupInput) => {
            if ('id' in input) {
              await updateGroup(input);
            }
            setIsEditModalOpen(false);
            onGroupUpdated();
          }}
        />
      )}
    </>
  );
}

export default AlbumHeader;
