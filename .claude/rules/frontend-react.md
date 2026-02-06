---
description: React/TypeScriptのコーディング規約
globs:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# フロントエンド規約（React / TypeScript）

## コンポーネント設計
- 関数コンポーネントのみ使用（クラスコンポーネント禁止）
- 単一責任の原則：1コンポーネント = 1責任
- 100行を超えたら分割を検討
- すべてのPropsは明示的に `type` で型定義（`interface` より `type` を優先）

## 型定義
- `any` の使用禁止
- 型定義は `src/types/image.ts` に集約
- Tauri invoke は `invoke<ReturnType>('command_name')` で型付き呼び出し

## 状態管理（Zustand）
- グローバル状態は `src/store/imageStore.ts` で一元管理
- persist ミドルウェアで永続化
- コンポーネント内でのローカル状態は `useState` / `useReducer`

## Tauri API呼び出し
- `src/utils/tauri-commands.ts` にラッパー関数を定義
- `@tauri-apps/api/core` の `invoke` を使用
- JSDocコメントで関数を文書化

## インポート順序
1. React / React DOM
2. 外部ライブラリ（zustand, lucide-react, react-router-dom）
3. 内部モジュール（store, utils, types）
4. コンポーネント
5. スタイル / アセット

## 命名規則
- コンポーネント / ファイル名: PascalCase (`MediaCard.tsx`)
- 関数 / 変数: camelCase (`handleClick`, `isLoading`)
- 定数: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- ユーティリティファイル名: camelCase (`tauri-commands.ts`)
