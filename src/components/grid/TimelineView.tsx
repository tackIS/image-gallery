import { useMemo } from 'react';
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

export default function TimelineView({ images, onImageClick }: TimelineViewProps) {
  const { gridDensity, setSelectedImageId } = useImageStore();
  const columns = useColumns(gridDensity);

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

  const handleClick = (imageId: number) => {
    if (onImageClick) {
      onImageClick(imageId);
    } else {
      setSelectedImageId(imageId);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {dateGroups.map((group) => (
        <section key={group.key} className="mb-6">
          <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm px-2 py-2 mb-2 rounded">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {group.label}
              <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                {group.count} items
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {group.images.map((media) => (
              <div key={media.id} style={{ width: `calc(${100 / columns}% - ${((columns - 1) * 16) / columns}px)` }}>
                <MediaCard
                  media={media}
                  onClick={() => handleClick(media.id)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
