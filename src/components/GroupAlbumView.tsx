import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useImageStore } from '../store/imageStore';
import { getGroupById, getGroupImages, setRepresentativeImage, getAllImages } from '../utils/tauri-commands';
import type { GroupData } from '../types/image';
import AlbumHeader from './AlbumHeader';
import Breadcrumb from './Breadcrumb';
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
    setImages,
    setError,
    isRepImageSelectionMode,
    setRepImageSelectionMode,
    showToast,
    updateGroup,
  } = useImageStore();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [groupImageIds, setGroupImageIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ページ遷移時にモード状態をクリア（依存配列を空にして1回だけ登録）
  useEffect(() => {
    return () => { useImageStore.getState().resetAllModes(); };
  }, []);

  // 代表画像をuseMemoで計算（パフォーマンス最適化）
  // allImages全体の変更ではなく、代表画像IDが変更された時のみ実質的に更新される
  const representativeImage = useMemo(() => {
    if (!group?.representative_image_id) return null;
    return allImages.find((img) => img.id === group.representative_image_id) || null;
  }, [allImages, group?.representative_image_id]);

  // グループデータとグループ内画像を読み込み
  const loadGroupData = useCallback(async () => {
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

      // グローバルのグループ配列も更新
      updateGroup(groupId, {
        name: groupData.name,
        description: groupData.description,
        color: groupData.color,
        representative_image_id: groupData.representative_image_id,
      });

      // グループ内の画像IDを取得
      const imageIds = await getGroupImages(groupId);
      setGroupImageIds(imageIds);

      // storeの画像にグループの画像が含まれていない場合、全画像をDBから再ロード
      const currentImages = useImageStore.getState().images;
      const currentImageIds = new Set(currentImages.map((img) => img.id));
      const hasMissing = imageIds.some((id) => !currentImageIds.has(id));
      if (hasMissing) {
        const allImgs = await getAllImages();
        setImages(allImgs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Failed to load group data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, setError, setImages, updateGroup]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

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
      // バックエンドに代表画像を保存
      await setRepresentativeImage(groupId, imageId);

      setRepImageSelectionMode(false, null);
      showToast('Representative image set successfully', 'success');

      // ローカルのgroup状態を即座に更新（useMemoが再計算される）
      setGroup((prev) => (prev ? { ...prev, representative_image_id: imageId } : null));

      // グローバルのグループ配列も即座に更新
      updateGroup(groupId, { representative_image_id: imageId });

      // バックエンドから最新のグループ情報を取得して同期
      const freshGroup = await getGroupById(groupId);
      setGroup(freshGroup);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      showToast('Failed to set representative image', 'error');
      console.error('Failed to set representative image:', err);
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
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col overflow-hidden">
      {/* ブレッドクラムナビゲーション */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <Breadcrumb
          items={[
            { label: 'Gallery', path: '/' },
            { label: group.name },
          ]}
        />
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
