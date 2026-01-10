import { convertFileSrc } from '@tauri-apps/api/core';
import { useImageStore } from '../store/imageStore';

/**
 * 画像グリッド表示コンポーネント
 *
 * データベースに登録された画像をレスポンシブなグリッドレイアウトで表示します。
 * 遅延読み込み（lazy loading）を使用してパフォーマンスを最適化します。
 */
export default function ImageGrid() {
  const { images } = useImageStore();

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500">No images found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
      {images.map((image) => {
        // Tauriのローカルファイルパスをブラウザでアクセス可能なURLに変換
        const imageUrl = convertFileSrc(image.file_path);

        return (
          <div
            key={image.id}
            className="relative aspect-square overflow-hidden rounded-lg bg-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <img
              src={imageUrl}
              alt={image.file_name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                // 画像読み込みエラー時の処理
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EError%3C/text%3E%3C/svg%3E';
              }}
            />
            {/* 画像情報のオーバーレイ */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-white text-xs truncate" title={image.file_name}>
                {image.file_name}
              </p>
              {image.rating > 0 && (
                <div className="flex items-center mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`w-3 h-3 ${
                        i < image.rating ? 'text-yellow-400' : 'text-gray-400'
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
      })}
    </div>
  );
}
