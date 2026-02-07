import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import VideoPlayer from '../VideoPlayer';

type ImageViewerProps = {
  src: string;
  fileName: string;
  fileType: 'image' | 'video';
};

export default function ImageViewer({ src, fileName, fileType }: ImageViewerProps) {
  if (fileType === 'video') {
    return (
      <div className="flex-1 flex items-center justify-center min-w-0">
        <VideoPlayer src={src} fileName={fileName} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center min-w-0 relative">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={5}
        doubleClick={{ mode: 'toggle', step: 2 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-black/50 rounded-lg p-1">
              <button
                onClick={() => zoomIn()}
                className="p-1.5 text-white hover:bg-white/20 rounded transition-colors"
                title="Zoom in (+)"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={() => zoomOut()}
                className="p-1.5 text-white hover:bg-white/20 rounded transition-colors"
                title="Zoom out (-)"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={() => resetTransform()}
                className="p-1.5 text-white hover:bg-white/20 rounded transition-colors"
                title="Reset zoom (0)"
              >
                <RotateCcw size={18} />
              </button>
            </div>
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <img
                src={src}
                alt={fileName}
                className="max-w-full max-h-[calc(100vh-2rem)] object-contain"
                draggable={false}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
