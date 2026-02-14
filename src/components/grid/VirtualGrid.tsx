import { useRef, useMemo, useState, useCallback } from 'react';
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
  const gridDensity = useImageStore(s => s.gridDensity);
  const setSelectedImageId = useImageStore(s => s.setSelectedImageId);
  const isSelectionMode = useImageStore(s => s.isSelectionMode);
  const toggleImageSelection = useImageStore(s => s.toggleImageSelection);
  const columns = useColumns(gridDensity);
  const [focusedIndex, setFocusedIndex] = useState(0);

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

  const handleClick = useCallback((imageId: number) => {
    if (onImageClick) {
      onImageClick(imageId);
    } else {
      setSelectedImageId(imageId);
    }
  }, [onImageClick, setSelectedImageId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, flatIndex: number) => {
    let nextIndex = flatIndex;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = Math.min(flatIndex + 1, images.length - 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = Math.max(flatIndex - 1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = Math.min(flatIndex + columns, images.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = Math.max(flatIndex - columns, 0);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isSelectionMode) {
          toggleImageSelection(images[flatIndex].id);
        } else if (onImageClick) {
          onImageClick(images[flatIndex].id);
        } else {
          setSelectedImageId(images[flatIndex].id);
        }
        return;
      default:
        return;
    }

    setFocusedIndex(nextIndex);
    // フォーカスを移動先のセルに当てる
    const targetRow = Math.floor(nextIndex / columns);
    const targetCol = nextIndex % columns;
    const rowEl = parentRef.current?.querySelector(`[data-row-index="${targetRow}"]`);
    const cellEl = rowEl?.querySelectorAll<HTMLElement>('[data-grid-cell]')[targetCol];
    cellEl?.focus();

    // 仮想スクロールの表示範囲に入るようスクロール
    virtualizer.scrollToIndex(targetRow);
  }, [images, columns, isSelectionMode, toggleImageSelection, onImageClick, setSelectedImageId, virtualizer]);

  return (
    <div ref={parentRef} role="grid" className="flex-1 min-h-0 overflow-y-auto p-4">
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
              role="row"
              data-row-index={virtualRow.index}
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
              {row.map((media, colIndex) => {
                const flatIndex = virtualRow.index * columns + colIndex;
                return (
                  <div key={media.id} data-grid-cell style={{ width: `${100 / columns}%` }}>
                    <MediaCard
                      media={media}
                      onClick={() => handleClick(media.id)}
                      forceClick={!!onImageClick}
                      tabIndex={flatIndex === focusedIndex ? 0 : -1}
                      ariaSelected={isSelectionMode ? undefined : undefined}
                      onKeyDown={(e) => handleKeyDown(e, flatIndex)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
