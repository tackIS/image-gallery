import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useImageStore } from '../../store/imageStore';
import MediaCard from '../MediaCard';
import type { ImageData } from '../../types/image';

type VirtualGridProps = {
  images: ImageData[];
  onImageClick?: (imageId: number) => void;
};

const DENSITY_COLUMNS = {
  compact: { base: 4, md: 6, lg: 8, xl: 10 },
  normal: { base: 2, md: 3, lg: 4, xl: 6 },
  comfortable: { base: 1, md: 2, lg: 3, xl: 4 },
} as const;

function useColumns(density: keyof typeof DENSITY_COLUMNS): number {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const cols = DENSITY_COLUMNS[density];
  if (width >= 1280) return cols.xl;
  if (width >= 1024) return cols.lg;
  if (width >= 768) return cols.md;
  return cols.base;
}

export default function VirtualGrid({ images, onImageClick }: VirtualGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { gridDensity, setSelectedImageId } = useImageStore();
  const columns = useColumns(gridDensity);

  const rows = useMemo(() => {
    const result: ImageData[][] = [];
    for (let i = 0; i < images.length; i += columns) {
      result.push(images.slice(i, i + columns));
    }
    return result;
  }, [images, columns]);

  const rowHeight = gridDensity === 'compact' ? 160 : gridDensity === 'comfortable' ? 320 : 220;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + 16,
    overscan: 3,
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
          const row = rows[virtualRow.index];
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
              className="flex gap-4"
            >
              {row.map((media) => (
                <div key={media.id} style={{ width: `${100 / columns}%` }}>
                  <MediaCard
                    media={media}
                    onClick={() => handleClick(media.id)}
                    forceClick={!!onImageClick}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
