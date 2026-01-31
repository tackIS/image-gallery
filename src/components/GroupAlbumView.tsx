import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import { getGroupById, getGroupImages, setRepresentativeImage } from '../utils/tauri-commands';
import type { GroupData, ImageData } from '../types/image';
import AlbumHeader from './AlbumHeader';
import ImageGrid from './ImageGrid';
import ImageDetail from './ImageDetail';
import LoadingSpinner from './LoadingSpinner';
import GroupComments from './GroupComments';
import Toast from './Toast';

function GroupAlbumView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const groupId = id ? parseInt(id, 10) : null;

  const {
    images: allImages,
    setError,
    isRepImageSelectionMode,
    setRepImageSelectionMode,
    showToast,
  } = useImageStore();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [groupImageIds, setGroupImageIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [representativeImage, setRepresentativeImageState] = useState<ImageData | null>(null);

  // グループデータとグループ内画像を読み込み
  const loadGroupData = async () => {
    if (!groupId) {
      setError('Invalid group ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // グループ情報を取得
      const groupData = await getGroupById(groupId);
      setGroup(groupData);

      // グループ内の画像IDを取得
      const imageIds = await getGroupImages(groupId);
      setGroupImageIds(imageIds);

      // 代表画像を設定
      if (groupData.representative_image_id) {
        const repImage = allImages.find((img) => img.id === groupData.representative_image_id);
        setRepresentativeImageState(repImage || null);
      } else {
        setRepresentativeImageState(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Failed to load group data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  // グループ内の画像のみをフィルタリング
  const groupImages = allImages.filter((img) => groupImageIds.includes(img.id));

  // 代表画像選択モード開始
  const handleSetRepresentativeImage = () => {
    if (!groupId) return;
    setRepImageSelectionMode(true, groupId);
    showToast('Click on an image to set it as the representative image', 'info');
  };

  // 代表画像選択モード中の画像クリック処理
  const handleImageClick = async (imageId: number) => {
    if (!isRepImageSelectionMode || !groupId) return;

    try {
      await setRepresentativeImage(groupId, imageId);
      setRepImageSelectionMode(false, null);
      showToast('Representative image set successfully', 'success');
      await loadGroupData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      showToast('Failed to set representative image', 'error');
    }
  };

  // 代表画像選択モードキャンセル
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRepImageSelectionMode) {
        setRepImageSelectionMode(false, null);
        showToast('Representative image selection cancelled', 'info');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRepImageSelectionMode, setRepImageSelectionMode, showToast]);

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Group not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col overflow-hidden">
      {/* ヘッダーナビゲーション */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to All Images</span>
        </button>
      </div>

      {/* スクロール可能なコンテンツエリア */}
      <div className="flex-1 overflow-y-auto">
        {/* アルバムヘッダー */}
        <AlbumHeader
          group={group}
          representativeImage={representativeImage}
          onSetRepresentativeImage={handleSetRepresentativeImage}
          onGroupUpdated={loadGroupData}
        />

        {/* 代表画像選択モード通知 */}
        {isRepImageSelectionMode && (
          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-6 py-3 text-center">
            Click on an image to set it as the representative image. Press ESC to cancel.
          </div>
        )}

        {/* 画像グリッド */}
        <div className="px-6 py-6">
          {groupImages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 dark:text-gray-400">
                No images in this group yet.
              </p>
            </div>
          ) : (
            <ImageGrid
              images={groupImages}
              onImageClick={isRepImageSelectionMode ? handleImageClick : undefined}
            />
          )}
        </div>

        {/* グループコメントセクション */}
        {groupId && (
          <div className="px-6 pb-6">
            <GroupComments groupId={groupId} />
          </div>
        )}
      </div>

      {/* トースト通知 */}
      <Toast />

      {/* 画像詳細モーダル（代表画像選択モード時は非表示） */}
      {!isRepImageSelectionMode && <ImageDetail />}
    </div>
  );
}

export default GroupAlbumView;
