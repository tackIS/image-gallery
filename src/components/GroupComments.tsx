import { useEffect, useState } from 'react';
import { Trash2, Send } from 'lucide-react';
import { getGroupComments, addGroupComment, deleteGroupComment } from '../utils/tauri-commands';
import type { GroupComment } from '../types/image';
import { useImageStore } from '../store/imageStore';

type GroupCommentsProps = {
  groupId: number;
};

function GroupComments({ groupId }: GroupCommentsProps) {
  const showToast = useImageStore(s => s.showToast);
  const setError = useImageStore(s => s.setError);
  const [comments, setComments] = useState<GroupComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // コメント読み込み
  const loadComments = async () => {
    try {
      setIsLoading(true);
      const commentsData = await getGroupComments(groupId);
      setComments(commentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [groupId]);

  // コメント追加
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedComment = newComment.trim();

    if (!trimmedComment) return;
    if (trimmedComment.length > 500) {
      showToast('Comment is too long (max 500 characters)', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await addGroupComment({ group_id: groupId, comment: trimmedComment });
      setNewComment('');
      showToast('Comment added successfully', 'success');
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      showToast('Failed to add comment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // コメント削除
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteGroupComment(commentId);
      showToast('Comment deleted successfully', 'success');
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      showToast('Failed to delete comment', 'error');
    }
  };

  // タイムスタンプをフォーマット
  const formatTimestamp = (timestamp: string) => {
    // SQLiteのCURRENT_TIMESTAMPはUTCなので、明示的にUTCとしてパース
    const date = new Date(timestamp.replace(' ', 'T') + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Comments</h2>
      </div>

      {/* コメント追加フォーム */}
      <form onSubmit={handleAddComment} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            maxLength={500}
            rows={2}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        {newComment.length > 450 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {500 - newComment.length} characters remaining
          </p>
        )}
      </form>

      {/* コメント一覧 */}
      <div className="px-6 py-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No comments yet. Be the first to add one!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="group flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                    {comment.comment}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {formatTimestamp(comment.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-opacity rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete comment"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupComments;
