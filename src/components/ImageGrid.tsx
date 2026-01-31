import { useImageStore } from '../store/imageStore';
import MediaCard from './MediaCard';
import type { ImageData } from '../types/image';

type ImageGridProps = {
  /** カスタム画像クリックハンドラー（代表画像選択モード用） */
  onImageClick?: (imageId: number) => void;
  /** 表示する画像リスト（指定しない場合はstoreから取得） */
  images?: ImageData[];
};

/**
 * メディアグリッド表示コンポーネント
 *
 * データベースに登録された画像・動画をレスポンシブなグリッドレイアウトで表示します。
 * 遅延読み込み（lazy loading）を使用してパフォーマンスを最適化します。
 */
export default function ImageGrid({ onImageClick, images: propsImages }: ImageGridProps) {
  const { images: storeImages, setSelectedImageId, getSortedImages, selectedGroupId, groups } = useImageStore();

  // propsで画像が渡された場合はそれを使用、なければstoreから取得
  const images = propsImages || storeImages;
  const sortedImages = propsImages || getSortedImages();

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500 dark:text-gray-400">No images or videos found</p>
      </div>
    );
  }

  if (sortedImages.length === 0) {
    // グループフィルター時のメッセージ
    if (selectedGroupId !== null) {
      const selectedGroup = groups.find((g) => g.id === selectedGroupId);
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <p className="text-gray-500 dark:text-gray-400">
            No images in "{selectedGroup?.name || 'this group'}"
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Add images to this group using selection mode
          </p>
        </div>
      );
    }

    // 通常のフィルター時のメッセージ
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500 dark:text-gray-400">No images match the current filters</p>
      </div>
    );
  }

  const handleImageClick = (imageId: number) => {
    if (onImageClick) {
      onImageClick(imageId);
    } else {
      setSelectedImageId(imageId);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
      {sortedImages.map((media) => (
        <MediaCard
          key={media.id}
          media={media}
          onClick={() => handleImageClick(media.id)}
        />
      ))}
    </div>
  );
}
