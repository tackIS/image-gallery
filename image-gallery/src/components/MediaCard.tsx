import { useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Play, AlertCircle, Heart } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import { updateImageMetadata } from '../utils/tauri-commands';
import type { ImageData } from '../types/image';

interface MediaCardProps {
  media: ImageData;
  onClick: () => void;
}

/**
 * メディアカードコンポーネント（画像または動画を表示）
 *
 * グリッド表示で使用され、画像の場合はimgタグ、
 * 動画の場合はvideoタグでサムネイル表示し、再生アイコンを表示します。
 * エラー時には適切なエラーメッセージを表示します。
 */
export default function MediaCard({ media, onClick }: MediaCardProps) {
  const mediaUrl = convertFileSrc(media.file_path, 'asset');
  const isVideo = media.file_type === 'video';
  const [hasError, setHasError] = useState(false);
  const { toggleFavorite } = useImageStore();
  const isFavorite = media.is_favorite === 1;

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

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-lg bg-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {hasError ? (
        // エラー時のプレースホルダー
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-300">
          <AlertCircle className="w-12 h-12 text-gray-500 mb-2" />
          <p className="text-xs text-gray-600 text-center px-2">
            {isVideo ? 'Video load error' : 'Image load error'}
          </p>
        </div>
      ) : isVideo ? (
        // 動画の場合: videoタグでサムネイル表示（最初のフレーム）
        <>
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

      {/* お気に入りボタン */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors z-10"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          size={18}
          className={isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600'}
        />
      </button>

      {/* ファイル情報のオーバーレイ */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pointer-events-none">
        <p className="text-white text-xs truncate" title={media.file_name}>
          {media.file_name}
        </p>
        {media.rating > 0 && (
          <div className="flex items-center mt-1">
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
      </div>
    </div>
  );
}
