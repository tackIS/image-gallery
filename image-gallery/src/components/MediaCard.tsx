import { convertFileSrc } from '@tauri-apps/api/core';
import { Play } from 'lucide-react';
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
 */
export default function MediaCard({ media, onClick }: MediaCardProps) {
  const mediaUrl = convertFileSrc(media.file_path, 'asset');
  const isVideo = media.file_type === 'video';

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-lg bg-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {isVideo ? (
        // 動画の場合: videoタグでサムネイル表示（最初のフレーム）
        <>
          <video
            src={mediaUrl}
            className="w-full h-full object-cover pointer-events-none"
            preload="metadata"
            onError={(e) => {
              console.error('Failed to load video:', media.file_path);
              const target = e.target as HTMLVideoElement;
              target.style.display = 'none';
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
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EError%3C/text%3E%3C/svg%3E';
          }}
        />
      )}

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
