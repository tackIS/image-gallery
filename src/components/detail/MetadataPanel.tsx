import { useState } from 'react';
import { Edit2, Save, XCircle, X, Folder, Info, Tags, MessageSquare } from 'lucide-react';
import type { ImageData, GroupData } from '../../types/image';
import RatingStars from './RatingStars';

type MetadataPanelProps = {
  image: ImageData;
  currentIndex: number;
  totalCount: number;
  belongingGroupIds: number[];
  groups: GroupData[];
  onSave: (data: { rating: number; comment: string; tags: string[] }) => Promise<void>;
};

type TabId = 'info' | 'edit' | 'groups';

export default function MetadataPanel({
  image,
  currentIndex,
  totalCount,
  belongingGroupIds,
  groups,
  onSave,
}: MetadataPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(image.rating);
  const [editComment, setEditComment] = useState(image.comment || '');
  const [editTags, setEditTags] = useState<string[]>(image.tags || []);
  const [newTag, setNewTag] = useState('');

  const handleSave = async () => {
    await onSave({ rating: editRating, comment: editComment, tags: editTags });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditRating(image.rating);
    setEditComment(image.comment || '');
    setEditTags(image.tags || []);
    setIsEditing(false);
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !editTags.some(tag => tag.toLowerCase() === trimmedTag.toLowerCase())) {
      setEditTags([...editTags, trimmedTag]);
      setNewTag('');
    }
  };

  const tabs: { id: TabId; icon: typeof Info; label: string }[] = [
    { id: 'info', icon: Info, label: 'Info' },
    { id: 'edit', icon: Tags, label: 'Edit' },
    { id: 'groups', icon: Folder, label: 'Groups' },
  ];

  return (
    <div className="w-80 lg:w-96 bg-gray-800 rounded-lg flex flex-col max-h-[calc(100vh-2rem)] shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white break-words">{image.file_name}</h2>
        <p className="text-xs text-gray-400 mt-1">{currentIndex + 1} / {totalCount}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              activeTab === id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Rating (read-only) */}
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Rating</h3>
              <RatingStars rating={image.rating} />
            </div>

            {/* Tags (read-only) */}
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {image.tags.length > 0 ? (
                  image.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No tags</span>
                )}
              </div>
            </div>

            {/* Comment (read-only) */}
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Comment</h3>
              <p className="text-sm text-white">
                {image.comment || <span className="text-gray-500">No comment</span>}
              </p>
            </div>

            {/* File info */}
            <div>
              <h3 className="text-sm text-gray-400 mb-1">File Path</h3>
              <p className="text-xs text-gray-300 break-all">{image.file_path}</p>
            </div>

            <div>
              <h3 className="text-sm text-gray-400 mb-1">Created</h3>
              <p className="text-sm text-white">
                {new Date(image.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </p>
            </div>

            <div>
              <h3 className="text-sm text-gray-400 mb-1">Updated</h3>
              <p className="text-sm text-white">
                {new Date(image.updated_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </p>
            </div>

            {/* Video metadata */}
            {image.file_type === 'video' && (
              <div className="pt-3 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Video Info</h3>
                <div className="space-y-1 text-sm text-gray-400">
                  {image.duration_seconds != null && (
                    <p><span className="text-gray-300">Duration:</span> {formatDuration(image.duration_seconds)}</p>
                  )}
                  {image.width != null && image.height != null && (
                    <p><span className="text-gray-300">Resolution:</span> {image.width}x{image.height}</p>
                  )}
                  {image.video_codec && (
                    <p><span className="text-gray-300">Video:</span> {image.video_codec.toUpperCase()}</p>
                  )}
                  {image.audio_codec && (
                    <p><span className="text-gray-300">Audio:</span> {image.audio_codec.toUpperCase()}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="space-y-4">
            {/* Edit / Save / Cancel controls */}
            <div className="flex justify-end gap-2">
              {!isEditing ? (
                <button
                  onClick={() => {
                    setEditRating(image.rating);
                    setEditComment(image.comment || '');
                    setEditTags(image.tags || []);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    <Save size={14} />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>
                </>
              )}
            </div>

            {/* Rating */}
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Rating</h3>
              <RatingStars
                rating={isEditing ? editRating : image.rating}
                editable={isEditing}
                onChange={setEditRating}
              />
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Tags</h3>
              {isEditing ? (
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editTags.map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                        {tag}
                        <button onClick={() => setEditTags(editTags.filter(t => t !== tag))} className="hover:text-blue-200">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                      placeholder="Add tag..."
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {image.tags.length > 0 ? (
                    image.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">{tag}</span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No tags</span>
                  )}
                </div>
              )}
            </div>

            {/* Comment */}
            <div>
              <h3 className="text-sm text-gray-400 mb-1">
                <MessageSquare size={14} className="inline mr-1" />
                Comment
              </h3>
              {isEditing ? (
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={4}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm text-white">
                  {image.comment || <span className="text-gray-500">No comment</span>}
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div>
            {belongingGroupIds.length === 0 ? (
              <p className="text-sm text-gray-500">Not in any group</p>
            ) : (
              <div className="space-y-2">
                {belongingGroupIds.map((groupId) => {
                  const group = groups.find((g) => g.id === groupId);
                  if (!group) return null;
                  return (
                    <div
                      key={groupId}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <Folder size={14} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-white">{group.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {group.image_count} items
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
