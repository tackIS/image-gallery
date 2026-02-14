import { useState, useEffect, memo } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Play, Heart, Check, Star, Tag, MessageSquare } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { updateImageMetadata, generateVideoThumbnail } from '../../utils/tauri-commands';
import type { ImageData } from '../../types/image';

type ListItemProps = {
  media: ImageData;
  onClick: () => void;
  forceClick?: boolean;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
};

export default memo(function ListItem({ media, onClick, forceClick, tabIndex, onKeyDown }: ListItemProps) {
  const mediaUrl = convertFileSrc(media.file_path, 'asset');
  const isVideo = media.file_type === 'video';
  const [hasError, setHasError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const isSelectionMode = useImageStore(s => s.isSelectionMode);
  const isSelected = useImageStore(s => s.selectedImageIds.includes(media.id));
  const toggleFavorite = useImageStore(s => s.toggleFavorite);
  const toggleImageSelection = useImageStore(s => s.toggleImageSelection);
  const isFavorite = media.is_favorite === 1;

  const handleClick = () => {
    if (forceClick) {
      onClick();
    } else if (isSelectionMode) {
      toggleImageSelection(media.id);
    } else {
      onClick();
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      toggleFavorite(media.id);
      await updateImageMetadata({ id: media.id, is_favorite: isFavorite ? 0 : 1 });
    } catch {
      toggleFavorite(media.id);
    }
  };

  useEffect(() => {
    if (isVideo && !thumbnailUrl) {
      generateVideoThumbnail(media.file_path, media.id)
        .then((path) => setThumbnailUrl(convertFileSrc(path, 'asset')))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo, media.id]);

  const imgSrc = isVideo ? (thumbnailUrl || `${mediaUrl}#t=0.1`) : mediaUrl;

  return (
    <div
      role="listitem"
      tabIndex={tabIndex}
      aria-label={`${media.file_name} — ${media.file_type}${media.rating > 0 ? `, rating ${media.rating}` : ''}`}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'
        }`}>
          {isSelected && <Check size={14} className="text-white" />}
        </div>
      )}

      {/* Thumbnail */}
      <div className="w-14 h-14 rounded overflow-hidden bg-gray-200 dark:bg-gray-600 shrink-0 relative">
        {hasError ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">ERR</div>
        ) : isVideo ? (
          <>
            <img src={imgSrc} alt="" className="w-full h-full object-cover" onError={() => setHasError(true)} />
            <Play size={16} className="absolute inset-0 m-auto text-white drop-shadow" fill="white" />
          </>
        ) : (
          <img src={imgSrc} alt="" loading="lazy" className="w-full h-full object-cover" onError={() => setHasError(true)} />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-gray-100 truncate" title={media.file_name}>
          {media.file_name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {media.rating > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-yellow-500">
              <Star size={12} fill="currentColor" />
              {media.rating}
            </span>
          )}
          {media.tags.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
              <Tag size={12} />
              {media.tags.length}
            </span>
          )}
          {media.comment && (
            <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
              <MessageSquare size={12} />
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">
            {media.file_type}
          </span>
        </div>
      </div>

      {/* Favorite */}
      <button
        onClick={handleFavoriteClick}
        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shrink-0"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart size={16} className={isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400 dark:text-gray-500'} />
      </button>
    </div>
  );
});
