/**
 * 画像のメタデータを表すインターフェース
 * データベースから取得した画像情報を格納します
 */
export interface ImageData {
  /** データベースの一意識別子 */
  id: number;
  /** 画像ファイルの絶対パス */
  file_path: string;
  /** 画像ファイル名 */
  file_name: string;
  /** ユーザーが追加したコメント */
  comment: string | null;
  /** 画像に関連付けられたタグの配列（データベースのJSON文字列からパース後） */
  tags: string[];
  /** 0-5の評価値 */
  rating: number;
  /** レコード作成日時（ISO 8601形式） */
  created_at: string;
  /** レコード最終更新日時（ISO 8601形式） */
  updated_at: string;
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
