import { useRef, useState, useCallback } from 'react';
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
  const setSelectedImageId = useImageStore(s => s.setSelectedImageId);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const virtualizer = useVirtualizer({
    count: images.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  const handleClick = useCallback((imageId: number) => {
    if (onImageClick) {
      onImageClick(imageId);
    } else {
      setSelectedImageId(imageId);
    }
  }, [onImageClick, setSelectedImageId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = Math.min(index + 1, images.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = Math.max(index - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (onImageClick) {
          onImageClick(images[index].id);
        } else {
          setSelectedImageId(images[index].id);
        }
        return;
      default:
        return;
    }

    setFocusedIndex(nextIndex);
    const itemEl = parentRef.current?.querySelector<HTMLElement>(`[data-list-index="${nextIndex}"]`);
    itemEl?.querySelector<HTMLElement>('[role="listitem"]')?.focus();
    virtualizer.scrollToIndex(nextIndex);
  }, [images, onImageClick, setSelectedImageId, virtualizer]);

  return (
    <div ref={parentRef} role="list" className="flex-1 overflow-y-auto p-4">
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
              data-list-index={virtualRow.index}
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
                tabIndex={virtualRow.index === focusedIndex ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, virtualRow.index)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
