import { useState, useEffect, memo } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Play, AlertCircle, Heart, Check } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useImageStore } from '../store/imageStore';
import { updateImageMetadata, generateVideoThumbnail } from '../utils/tauri-commands';
import type { ImageData } from '../types/image';

type MediaCardProps = {
  media: ImageData;
  onClick: () => void;
  forceClick?: boolean;
  tabIndex?: number;
  ariaSelected?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
};

/**
 * メディアカードコンポーネント（画像または動画を表示）
 *
 * グリッド表示で使用され、画像の場合はimgタグ、
 * 動画の場合はvideoタグでサムネイル表示し、再生アイコンを表示します。
 * エラー時には適切なエラーメッセージを表示します。
 */
export default memo(function MediaCard({ media, onClick, forceClick, tabIndex, ariaSelected, onKeyDown }: MediaCardProps) {
  const mediaUrl = convertFileSrc(media.file_path, 'asset');
  const isVideo = media.file_type === 'video';
  const [hasError, setHasError] = useState(false);
  const isSelectionMode = useImageStore(s => s.isSelectionMode);
  const isSelected = useImageStore(s => s.selectedImageIds.includes(media.id));
  const toggleFavorite = useImageStore(s => s.toggleFavorite);
  const toggleImageSelection = useImageStore(s => s.toggleImageSelection);
  const isFavorite = media.is_favorite === 1;
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `media-${media.id}`,
  });

  const handleCardClick = () => {
    if (forceClick) {
      // forceClick時: isSelectionModeを無視してonClickを呼ぶ
      onClick();
    } else if (isSelectionMode) {
      // 選択モード時: 選択/解除をトグル
      toggleImageSelection(media.id);
    } else {
      // 通常時: 詳細モーダルを開く
      onClick();
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card onClick from firing
    try {
      toggleFavorite(media.id);
      await updateImageMetadata({
        id: media.id,
        is_favorite: isFavorite ? 0 : 1,
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Revert on error
      toggleFavorite(media.id);
    }
  };

  // 動画の場合、サムネイル生成
  useEffect(() => {
    if (isVideo && !thumbnailUrl && !isGeneratingThumbnail) {
      setIsGeneratingThumbnail(true);

      generateVideoThumbnail(media.file_path, media.id)
        .then((path) => {
          const url = convertFileSrc(path, 'asset');
          setThumbnailUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate thumbnail:', err);
          // フォールバック: videoタグ使用
        })
        .finally(() => {
          setIsGeneratingThumbnail(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo, media.id, media.file_path]);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      tabIndex={tabIndex}
      aria-selected={ariaSelected}
      onKeyDown={onKeyDown}
      className={`relative aspect-square overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 shadow-[--shadow-card] hover:shadow-[--shadow-card-hover] hover:scale-[1.02] hover:ring-2 hover:ring-blue-400 transition-all duration-[--transition-fast] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isSelected ? 'ring-4 ring-blue-500' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={handleCardClick}
    >
      {hasError ? (
        // エラー時のプレースホルダー
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-300 dark:bg-gray-600">
          <AlertCircle className="w-12 h-12 text-gray-500 dark:text-gray-400 mb-2" />
          <p className="text-xs text-gray-600 dark:text-gray-300 text-center px-2">
            {isVideo ? 'Unsupported video format' : 'Image load error'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {media.file_name.split('.').pop()?.toUpperCase()}
          </p>
        </div>
      ) : isVideo ? (
        // 動画の場合: サムネイル画像または videoタグ
        <>
          {thumbnailUrl ? (
            // サムネイル画像表示
            <img
              src={thumbnailUrl}
              alt={media.file_name}
              className="w-full h-full object-cover pointer-events-none"
              onError={() => setHasError(true)}
            />
          ) : isGeneratingThumbnail ? (
            // 生成中のローディング表示
            <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            // フォールバック: videoタグ（既存実装）
            <video
              src={`${mediaUrl}#t=0.1`}
              className="w-full h-full object-cover pointer-events-none"
              preload="metadata"
              muted
              onError={() => {
                console.error('Failed to load video:', media.file_path);
                setHasError(true);
              }}
            />
          )}
          {/* 再生アイコンオーバーレイ */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="w-8 h-8 text-gray-800" fill="currentColor" />
            </div>
          </div>
        </>
      ) : (
        // 画像の場合: imgタグで表示
        <img
          src={mediaUrl}
          alt={media.file_name}
          loading="lazy"
          className="w-full h-full object-cover pointer-events-none"
          onError={() => {
            console.error('Failed to load image:', media.file_path);
            setHasError(true);
          }}
        />
      )}

      {/* 選択チェックボックス（選択モード時） */}
      {isSelectionMode && (
        <div
          className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center z-10 transition-colors ${
            isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'bg-white/90 dark:bg-gray-800/90 border-gray-300 dark:border-gray-600'
          }`}
        >
          {isSelected && <Check size={16} className="text-white" />}
        </div>
      )}

      {/* お気に入りボタン */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 transition-colors z-10"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          size={18}
          className={isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600 dark:text-gray-300'}
        />
      </button>

      {/* ファイル情報のオーバーレイ */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pointer-events-none">
        <p className="text-white text-xs line-clamp-2 leading-tight" title={media.file_name}>
          {media.file_name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {media.rating > 0 && (
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-3 h-3 ${
                    i < media.rating ? 'text-yellow-400' : 'text-gray-400'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          )}
          {media.tags.length > 0 && (
            <span className="text-white/70 text-[10px]">{media.tags.length} tags</span>
          )}
          {media.comment && (
            <span className="text-white/70 text-[10px]">💬</span>
          )}
        </div>
      </div>
    </div>
  );
});
