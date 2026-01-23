import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import type { SlideshowInterval } from '../store/imageStore';

interface SlideshowControlsProps {
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * スライドショーコントロールパネルコンポーネント
 * 再生/一時停止、スキップ、速度調整を提供します
 */
export default function SlideshowControls({
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
}: SlideshowControlsProps) {
  const { isSlideshowActive, slideshowInterval, toggleSlideshow, setSlideshowInterval } =
    useImageStore();

  const intervals: SlideshowInterval[] = [3, 5, 10];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        color: 'white',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Previous button */}
      <button
        onClick={onPrevious}
        disabled={currentIndex === 0}
        style={{
          padding: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: 'white',
          cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
          opacity: currentIndex === 0 ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
        }}
        aria-label="Previous"
      >
        <SkipBack size={20} />
      </button>

      {/* Play/Pause button */}
      <button
        onClick={toggleSlideshow}
        style={{
          padding: '8px',
          backgroundColor: '#3b82f6',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
        aria-label={isSlideshowActive ? 'Pause' : 'Play'}
      >
        {isSlideshowActive ? <Pause size={20} /> : <Play size={20} />}
      </button>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={currentIndex === totalCount - 1}
        style={{
          padding: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: 'white',
          cursor: currentIndex === totalCount - 1 ? 'not-allowed' : 'pointer',
          opacity: currentIndex === totalCount - 1 ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
        }}
        aria-label="Next"
      >
        <SkipForward size={20} />
      </button>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
        }}
      />

      {/* Speed selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: '#d1d5db' }}>Speed:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {intervals.map((interval) => (
            <button
              key={interval}
              onClick={() => setSlideshowInterval(interval)}
              style={{
                padding: '4px 8px',
                backgroundColor:
                  slideshowInterval === interval ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {interval}s
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div
        style={{
          fontSize: '14px',
          color: '#d1d5db',
        }}
      >
        {currentIndex + 1} / {totalCount}
      </div>
    </div>
  );
}
