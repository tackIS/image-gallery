import { useImageStore } from '../store/imageStore';
import MediaCard from './MediaCard';

/**
 * メディアグリッド表示コンポーネント
 *
 * データベースに登録された画像・動画をレスポンシブなグリッドレイアウトで表示します。
 * 遅延読み込み（lazy loading）を使用してパフォーマンスを最適化します。
 */
export default function ImageGrid() {
  const { images, setSelectedImageId, getSortedImages } = useImageStore();
  const sortedImages = getSortedImages();

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500">No images or videos found</p>
      </div>
    );
  }

  if (sortedImages.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500">No images match the current filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
      {sortedImages.map((media) => (
        <MediaCard
          key={media.id}
          media={media}
          onClick={() => setSelectedImageId(media.id)}
        />
      ))}
    </div>
  );
}
