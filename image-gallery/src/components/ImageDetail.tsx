import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useImageStore } from '../store/imageStore';
import { updateImageMetadata, getAllImages } from '../utils/tauri-commands';
import { X, ChevronLeft, ChevronRight, Edit2, Save, XCircle, Presentation } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import SlideshowControls from './SlideshowControls';

/**
 * 画像・動画詳細表示モーダルコンポーネント
 *
 * 選択された画像をフルサイズで表示、動画を再生し、メタデータを表示・編集します。
 * キーボードショートカット:
 * - ESC: モーダルを閉じる
 * - 左矢印: 前のファイルへ
 * - 右矢印: 次のファイルへ
 */
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
  } = useImageStore();

  // 編集モード状態
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // 選択された画像を取得
  const selectedImage = images.find((img) => img.id === selectedImageId);
  const currentIndex = images.findIndex((img) => img.id === selectedImageId);

  // 画像が変更されたら編集モードをリセット
  useEffect(() => {
    if (selectedImage) {
      setEditRating(selectedImage.rating);
      setEditComment(selectedImage.comment || '');
      setEditTags(selectedImage.tags || []);
      setIsEditing(false);
    }
  }, [selectedImage]);

  // キーボードショートカット（編集モードでない場合のみ）
  useEffect(() => {
    if (selectedImageId === null || isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImageId(null);
        stopSlideshow();
      } else if (e.key === 'ArrowLeft') {
        const idx = images.findIndex((img) => img.id === selectedImageId);
        if (idx > 0) {
          setSelectedImageId(images[idx - 1].id);
        }
      } else if (e.key === 'ArrowRight') {
        const idx = images.findIndex((img) => img.id === selectedImageId);
        if (idx < images.length - 1) {
          setSelectedImageId(images[idx + 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId, images, setSelectedImageId, isEditing, stopSlideshow]);

  // スライドショー自動再生
  useEffect(() => {
    if (!isSlideshowActive || selectedImageId === null || isEditing) return;

    const timer = setTimeout(() => {
      const currentIdx = images.findIndex((img) => img.id === selectedImageId);
      if (currentIdx < images.length - 1) {
        setSelectedImageId(images[currentIdx + 1].id);
      } else {
        // 最後の画像に到達したらスライドショーを停止
        stopSlideshow();
      }
    }, slideshowInterval * 1000);

    return () => clearTimeout(timer);
  }, [isSlideshowActive, selectedImageId, images, slideshowInterval, setSelectedImageId, isEditing, stopSlideshow]);

  // 編集内容を保存
  const handleSave = async () => {
    if (!selectedImage) return;

    try {
      await updateImageMetadata({
        id: selectedImage.id,
        rating: editRating,
        comment: editComment || undefined,
        tags: editTags,
      });

      // データベースから最新の画像リストを再取得
      const updatedImages = await getAllImages();
      setImages(updatedImages);

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save metadata:', error);
      alert('Failed to save changes');
    }
  };

  // 編集をキャンセル
  const handleCancel = () => {
    if (!selectedImage) return;
    setEditRating(selectedImage.rating);
    setEditComment(selectedImage.comment || '');
    setEditTags(selectedImage.tags || []);
    setIsEditing(false);
  };

  // タグを追加
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !editTags.some(tag => tag.toLowerCase() === trimmedTag.toLowerCase())) {
      setEditTags([...editTags, trimmedTag]);
      setNewTag('');
    }
  };

  // タグを削除
  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter((tag) => tag !== tagToRemove));
  };

  // 前の画像へ移動
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setSelectedImageId(images[currentIndex - 1].id);
    }
  };

  // 次の画像へ移動
  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setSelectedImageId(images[currentIndex + 1].id);
    }
  };

  // 画像が選択されていない場合は何も表示しない
  if (!selectedImage) {
    return null;
  }

  const imageUrl = convertFileSrc(selectedImage.file_path, 'asset');

  return createPortal(
    <div
      onClick={() => !isEditing && setSelectedImageId(null)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* モーダルコンテンツ */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 閉じるボタン */}
        <button
          onClick={() => {
            setSelectedImageId(null);
            stopSlideshow();
          }}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            padding: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '50%',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* スライドショー開始ボタン（スライドショー非アクティブ時のみ） */}
        {!isSlideshowActive && !isEditing && (
          <button
            onClick={startSlideshow}
            style={{
              position: 'absolute',
              top: '16px',
              right: '64px',
              zIndex: 10,
              padding: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Start slideshow"
            title="Start slideshow"
          >
            <Presentation className="w-6 h-6" />
          </button>
        )}

        {/* 前の画像ボタン（編集モードでない場合、スライドショー非アクティブ時のみ） */}
        {!isEditing && !isSlideshowActive && currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            style={{
              position: 'absolute',
              left: '16px',
              zIndex: 10,
              padding: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        {/* 次の画像ボタン（編集モードでない場合、スライドショー非アクティブ時のみ） */}
        {!isEditing && !isSlideshowActive && currentIndex < images.length - 1 && (
          <button
            onClick={handleNext}
            style={{
              position: 'absolute',
              right: '16px',
              zIndex: 10,
              padding: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* スライドショーコントロール（スライドショーアクティブ時のみ） */}
        {isSlideshowActive && !isEditing && (
          <SlideshowControls
            currentIndex={currentIndex}
            totalCount={images.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        )}

        {/* メイン画像・動画表示エリア */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', maxWidth: '100%', maxHeight: '100%' }}>
            {/* 画像または動画 */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedImage.file_type === 'video' ? (
                <VideoPlayer
                  src={imageUrl}
                  fileName={selectedImage.file_name}
                />
              ) : (
                <img
                  src={imageUrl}
                  alt={selectedImage.file_name}
                  style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 2rem)', objectFit: 'contain' }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>

            {/* メタデータパネル（スライドショー非アクティブ時のみ） */}
            {!isSlideshowActive && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '320px',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  padding: '24px',
                  borderRadius: '8px',
                  overflowY: 'auto',
                  maxHeight: 'calc(100vh - 2rem)',
                }}
              >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', wordBreak: 'break-word', flex: 1 }}>
                  {selectedImage.file_name}
                </h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      padding: '6px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'white',
                    }}
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSave}
                      style={{
                        padding: '6px',
                        backgroundColor: '#10b981',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'white',
                      }}
                      title="Save"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      style={{
                        padding: '6px',
                        backgroundColor: '#ef4444',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'white',
                      }}
                      title="Cancel"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* レーティング */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Rating</h3>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        onClick={() => isEditing && setEditRating(i + 1)}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        style={{
                          width: '20px',
                          height: '20px',
                          color: i < (isEditing ? editRating : selectedImage.rating) ? '#fbbf24' : '#4b5563',
                          cursor: isEditing ? 'pointer' : 'default',
                        }}
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>

                {/* タグ */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Tags</h3>
                  {isEditing ? (
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        {editTags.map((tag, index) => (
                          <span
                            key={index}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#2563eb',
                              borderRadius: '4px',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0',
                                display: 'flex',
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Add tag..."
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            backgroundColor: '#374151',
                            border: '1px solid #4b5563',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '14px',
                          }}
                        />
                        <button
                          onClick={handleAddTag}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'white',
                            fontSize: '14px',
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedImage.tags.length > 0 ? (
                        selectedImage.tags.map((tag, index) => (
                          <span
                            key={index}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#2563eb',
                              borderRadius: '4px',
                              fontSize: '14px',
                            }}
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>No tags</span>
                      )}
                    </div>
                  )}
                </div>

                {/* コメント */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Comment</h3>
                  {isEditing ? (
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#374151',
                        border: '1px solid #4b5563',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '14px',
                        resize: 'vertical',
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '14px' }}>
                      {selectedImage.comment || <span style={{ color: '#6b7280' }}>No comment</span>}
                    </p>
                  )}
                </div>

                {/* ファイルパス */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>File Path</h3>
                  <p style={{ fontSize: '12px', wordBreak: 'break-all', color: '#d1d5db' }}>
                    {selectedImage.file_path}
                  </p>
                </div>

                {/* 作成日時 */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Created At</h3>
                  <p style={{ fontSize: '14px' }}>
                    {new Date(selectedImage.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                  </p>
                </div>

                {/* 更新日時 */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Updated At</h3>
                  <p style={{ fontSize: '14px' }}>
                    {new Date(selectedImage.updated_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                  </p>
                </div>

                {/* 画像番号 */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Position</h3>
                  <p style={{ fontSize: '14px' }}>
                    {currentIndex + 1} / {images.length}
                  </p>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
