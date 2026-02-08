import { useImageStore } from '../store/imageStore';
import VirtualGrid from './grid/VirtualGrid';
import VirtualList from './grid/VirtualList';
import TimelineView from './grid/TimelineView';
import type { ImageData } from '../types/image';

type ImageGridProps = {
  onImageClick?: (imageId: number) => void;
  images?: ImageData[];
};

export default function ImageGrid({ onImageClick, images: propsImages }: ImageGridProps) {
  const { images: storeImages, getSortedImages, selectedGroupId, groups, viewMode } = useImageStore();

  const displayImages = propsImages ?? getSortedImages();
  const allImages = propsImages ?? storeImages;

  if (allImages.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500 dark:text-gray-400">No images or videos found</p>
      </div>
    );
  }

  if (displayImages.length === 0) {
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

    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500 dark:text-gray-400">No images match the current filters</p>
      </div>
    );
  }

  if (viewMode === 'timeline') {
    return <TimelineView images={displayImages} onImageClick={onImageClick} />;
  }

  if (viewMode === 'list') {
    return <VirtualList images={displayImages} onImageClick={onImageClick} />;
  }

  return <VirtualGrid images={displayImages} onImageClick={onImageClick} />;
}
