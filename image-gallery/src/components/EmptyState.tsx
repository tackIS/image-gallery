import { ImageOff } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500">
      <ImageOff size={64} className="mb-4" />
      <h2 className="text-xl font-semibold mb-2">No Images Found</h2>
      <p className="text-sm">
        Click "Select Directory" to load images from a folder
      </p>
    </div>
  );
}
