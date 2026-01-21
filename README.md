# Image Gallery Manager

画像ギャラリー管理デスクトップアプリ（macOS向け）

## 概要

ローカルディレクトリの画像を管理し、コメント・タグ・評価などのメタデータを付与できるギャラリーアプリケーションです。

## 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **デスクトップ**: Tauri
- **データベース**: SQLite
- **状態管理**: Zustand
- **スタイリング**: Tailwind CSS
- **ルーティング**: React Router v6

## 主な機能（MVP）

- ディレクトリ選択機能
- 画像一覧表示（グリッドレイアウト）
- 画像詳細表示
- コメント・タグ・評価の追加/編集
- SQLiteでのデータ永続化

## セットアップ

```bash
cd image-gallery
npm install
```

  ## 開発

```bash
npm run tauri:dev
```

## ビルド

```bash
npm run tauri:build
```

## ドキュメント

- [要件定義](./doc/01_requirement.md)
- [Phase 1 実装プラン (MP4対応)](./doc/02_mp4-support-plan.md)
- [Phase 2 開発提案](./doc/03_phase2-proposal.md)

## ライセンス

Private
