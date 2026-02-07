import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useImageStore } from '../../store/imageStore';
import ListItem from './ListItem';
import type { ImageData } from '../../types/image';

type VirtualListProps = {
  images: ImageData[];
  onImageClick?: (imageId: number) => void;
};

export default function VirtualList({ images, onImageClick }: VirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { setSelectedImageId } = useImageStore();

  const virtualizer = useVirtualizer({
    count: images.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  const handleClick = (imageId: number) => {
    if (onImageClick) {
      onImageClick(imageId);
    } else {
      setSelectedImageId(imageId);
    }
  };

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto p-4">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const media = images[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ListItem
                media={media}
                onClick={() => handleClick(media.id)}
                forceClick={!!onImageClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
