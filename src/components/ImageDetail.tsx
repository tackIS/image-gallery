import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useImageStore } from '../store/imageStore';
import { updateImageMetadata, getAllImages, getImageGroups } from '../utils/tauri-commands';
import { X, ChevronLeft, ChevronRight, Presentation } from 'lucide-react';
import SlideshowControls from './SlideshowControls';
import ImageViewer from './detail/ImageViewer';
import MetadataPanel from './detail/MetadataPanel';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function ImageDetail() {
  const {
    images,
    selectedImageId,
    setSelectedImageId,
    setImages,
    isSlideshowActive,
    slideshowInterval,
    startSlideshow,
    stopSlideshow,
    groups,
  } = useImageStore();

  const [belongingGroupIds, setBelongingGroupIds] = useState<number[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, selectedImageId !== null);

  const selectedImage = images.find((img) => img.id === selectedImageId);
  const currentIndex = images.findIndex((img) => img.id === selectedImageId);

  useEffect(() => {
    if (selectedImage) {
      getImageGroups(selectedImage.id)
        .then((groupIds) => setBelongingGroupIds(groupIds))
        .catch(() => setBelongingGroupIds([]));
    }
  }, [selectedImage]);

  useEffect(() => {
    if (selectedImageId === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImageId(null);
        stopSlideshow();
      } else if (e.key === 'ArrowLeft') {
        const idx = images.findIndex((img) => img.id === selectedImageId);
        if (idx > 0) setSelectedImageId(images[idx - 1].id);
      } else if (e.key === 'ArrowRight') {
        const idx = images.findIndex((img) => img.id === selectedImageId);
        if (idx < images.length - 1) setSelectedImageId(images[idx + 1].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId, images, setSelectedImageId, stopSlideshow]);

  useEffect(() => {
    if (!isSlideshowActive || selectedImageId === null) return;

    const timer = setTimeout(() => {
      const currentIdx = images.findIndex((img) => img.id === selectedImageId);
      if (currentIdx < images.length - 1) {
        setSelectedImageId(images[currentIdx + 1].id);
      } else {
        stopSlideshow();
      }
    }, slideshowInterval * 1000);

    return () => clearTimeout(timer);
  }, [isSlideshowActive, selectedImageId, images, slideshowInterval, setSelectedImageId, stopSlideshow]);

  const handleSave = async (data: { rating: number; comment: string; tags: string[] }) => {
    if (!selectedImage) return;
    await updateImageMetadata({
      id: selectedImage.id,
      rating: data.rating,
      comment: data.comment,
      tags: data.tags,
    });
    const updatedImages = await getAllImages();
    setImages(updatedImages);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setSelectedImageId(images[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) setSelectedImageId(images[currentIndex + 1].id);
  };

  if (!selectedImage) return null;

  const imageUrl = convertFileSrc(selectedImage.file_path, 'asset');

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="画像詳細"
      onClick={() => setSelectedImageId(null)}
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Close button */}
        <button
          onClick={() => { setSelectedImageId(null); stopSlideshow(); }}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Slideshow button */}
        {!isSlideshowActive && (
          <button
            onClick={startSlideshow}
            className="absolute top-4 right-14 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Start slideshow"
            title="Start slideshow"
          >
            <Presentation size={24} />
          </button>
        )}

        {/* Nav buttons */}
        {!isSlideshowActive && currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            className="absolute left-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {!isSlideshowActive && currentIndex < images.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight size={32} />
          </button>
        )}

        {/* Slideshow controls */}
        {isSlideshowActive && (
          <SlideshowControls
            currentIndex={currentIndex}
            totalCount={images.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        )}

        {/* Main content area */}
        <div className="flex items-center justify-center w-full h-full p-4 gap-4">
          <ImageViewer
            src={imageUrl}
            fileName={selectedImage.file_name}
            fileType={selectedImage.file_type}
          />

          {!isSlideshowActive && (
            <MetadataPanel
              key={selectedImage.id}
              image={selectedImage}
              currentIndex={currentIndex}
              totalCount={images.length}
              belongingGroupIds={belongingGroupIds}
              groups={groups}
              onSave={handleSave}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
