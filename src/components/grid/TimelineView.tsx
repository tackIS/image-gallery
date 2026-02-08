import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useImageStore } from '../../store/imageStore';
import MediaCard from '../MediaCard';
import type { ImageData, DateGroup } from '../../types/image';

type TimelineViewProps = {
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

function formatYearMonth(key: string): string {
  const [year, month] = key.split('-');
  return `${year}年${parseInt(month, 10)}月`;
}

type VirtualRow =
  | { type: 'header'; key: string; label: string; count: number }
  | { type: 'row'; images: ImageData[] };

const HEADER_HEIGHT = 44;

export default function TimelineView({ images, onImageClick }: TimelineViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { gridDensity, setSelectedImageId } = useImageStore();
  const columns = useColumns(gridDensity);
  const rowHeight = gridDensity === 'compact' ? 160 : gridDensity === 'comfortable' ? 320 : 220;

  const dateGroups: DateGroup[] = useMemo(() => {
    const groupMap = new Map<string, ImageData[]>();

    for (const img of images) {
      const date = new Date(img.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const group = groupMap.get(key);
      if (group) {
        group.push(img);
      } else {
        groupMap.set(key, [img]);
      }
    }

    return Array.from(groupMap.entries()).map(([key, imgs]) => ({
      key,
      label: formatYearMonth(key),
      count: imgs.length,
      images: imgs,
    }));
  }, [images]);

  const flatRows = useMemo(() => {
    const rows: VirtualRow[] = [];
    for (const group of dateGroups) {
      rows.push({ type: 'header', key: group.key, label: group.label, count: group.count });
      for (let i = 0; i < group.images.length; i += columns) {
        rows.push({ type: 'row', images: group.images.slice(i, i + columns) });
      }
    }
    return rows;
  }, [dateGroups, columns]);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => flatRows[i].type === 'header' ? HEADER_HEIGHT : rowHeight + 16,
    overscan: 3,
  });

  const virtualItems = virtualizer.getVirtualItems();

  let stickyHeader: (VirtualRow & { type: 'header' }) | null = null;
  if (virtualItems.length > 0) {
    const firstIndex = virtualItems[0].index;
    for (let i = firstIndex; i >= 0; i--) {
      const row = flatRows[i];
      if (row.type === 'header') {
        stickyHeader = row;
        break;
      }
    }
  }

  const handleClick = (imageId: number) => {
    if (onImageClick) {
      onImageClick(imageId);
    } else {
      setSelectedImageId(imageId);
    }
  };

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto p-4 relative">
      {stickyHeader && (
        <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm px-2 py-2 rounded">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {stickyHeader.label}
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              {stickyHeader.count} items
            </span>
          </h2>
        </div>
      )}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const row = flatRows[virtualItem.index];
          if (row.type === 'header') {
            return (
              <div
                key={`header-${row.key}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm px-2 py-2 rounded flex items-center"
              >
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {row.label}
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                    {row.count} items
                  </span>
                </h2>
              </div>
            );
          }
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="flex gap-4"
            >
              {row.images.map((media) => (
                <div key={media.id} style={{ width: `${100 / columns}%` }}>
                  <MediaCard
                    media={media}
                    onClick={() => handleClick(media.id)}
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
