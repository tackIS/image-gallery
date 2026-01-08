export interface ImageData {
  id: number;
  file_path: string;
  file_name: string;
  comment: string | null;
  tags: string[]; // JSON文字列からパース後
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface ImageMetadataUpdate {
  id: number;
  comment?: string;
  tags?: string[];
  rating?: number;
}

export interface DirectoryInfo {
  path: string;
  imageCount: number;
}
