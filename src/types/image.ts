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
