/**
 * ファイルの種類を表す型
 */
export type FileType = 'image' | 'video';

/**
 * 画像・動画のメタデータを表すインターフェース
 * データベースから取得したメディアファイル情報を格納します
 */
export interface ImageData {
  /** データベースの一意識別子 */
  id: number;
  /** ファイルの絶対パス */
  file_path: string;
  /** ファイル名 */
  file_name: string;
  /** ファイルの種類（image または video） */
  file_type: FileType;
  /** ユーザーが追加したコメント */
  comment: string | null;
  /** ファイルに関連付けられたタグの配列（データベースのJSON文字列からパース後） */
  tags: string[];
  /** 0-5の評価値 */
  rating: number;
  /** お気に入りかどうか（0: false, 1: true） */
  is_favorite: number;
  /** レコード作成日時（ISO 8601形式） */
  created_at: string;
  /** レコード最終更新日時（ISO 8601形式） */
  updated_at: string;

  // Phase 3 追加フィールド
  /** 動画の長さ（秒）- 動画のみ */
  duration_seconds: number | null;
  /** 動画の幅（ピクセル）- 動画のみ */
  width: number | null;
  /** 動画の高さ（ピクセル）- 動画のみ */
  height: number | null;
  /** ビデオコーデック - 動画のみ */
  video_codec: string | null;
  /** オーディオコーデック - 動画のみ */
  audio_codec: string | null;
  /** サムネイル画像のパス - 動画のみ */
  thumbnail_path: string | null;
}

/**
 * 画像のメタデータを更新するためのインターフェース
 * 更新したいフィールドのみを含めます
 */
export interface ImageMetadataUpdate {
  /** 更新対象の画像ID */
  id: number;
  /** 更新するコメント（オプション） */
  comment?: string;
  /** 更新するタグの配列（オプション） */
  tags?: string[];
  /** 更新する評価値（オプション） */
  rating?: number;
  /** 更新するお気に入り状態（オプション） */
  is_favorite?: number;
}

/**
 * ディレクトリ情報を表すインターフェース
 */
export interface DirectoryInfo {
  /** ディレクトリの絶対パス */
  path: string;
  /** ディレクトリ内の画像ファイル数 */
  imageCount: number;
}

// ============================================================
// Phase 4: グループ管理機能
// ============================================================

/**
 * グループ情報を表すインターフェース
 */
export interface GroupData {
  /** グループID */
  id: number;
  /** グループ名 */
  name: string;
  /** 説明文（任意） */
  description: string | null;
  /** 色ラベル（HEXカラーコード） */
  color: string;
  /** 代表画像ID（任意） */
  representative_image_id: number | null;
  /** 作成日時（ISO 8601形式） */
  created_at: string;
  /** 最終更新日時（ISO 8601形式） */
  updated_at: string;
  /** グループ内の画像数 */
  image_count: number;
}

/**
 * グループ作成入力
 */
export interface CreateGroupInput {
  /** グループ名（必須） */
  name: string;
  /** 説明文（任意） */
  description?: string;
  /** 色ラベル（任意、デフォルト: #3b82f6） */
  color?: string;
  /** 代表画像ID（任意） */
  representative_image_id?: number;
}

/**
 * グループ更新入力
 */
export interface UpdateGroupInput {
  /** グループID */
  id: number;
  /** グループ名（任意） */
  name?: string;
  /** 説明文（任意） */
  description?: string;
  /** 色ラベル（任意） */
  color?: string;
  /** 代表画像ID（任意） */
  representative_image_id?: number;
}

// ============================================================
// Phase 5: グループアルバムビュー & コメント機能
// ============================================================

/**
 * グループコメント情報を表すインターフェース
 */
export interface GroupComment {
  /** コメントID */
  id: number;
  /** グループID */
  group_id: number;
  /** コメント本文 */
  comment: string;
  /** 作成日時（ISO 8601形式） */
  created_at: string;
}

/**
 * グループコメント追加入力
 */
export interface AddCommentInput {
  /** グループID */
  group_id: number;
  /** コメント本文 */
  comment: string;
}
