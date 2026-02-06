---
description: ビルドとテストのチェックリスト
---

# テスト・ビルドチェックリスト

## コード変更後の確認手順

### 必須チェック
1. `npx tsc --noEmit` — TypeScript型チェック
2. `npm run lint` — ESLintチェック
3. `cargo check --manifest-path src-tauri/Cargo.toml` — Rustコンパイルチェック
4. `npm run build` — フロントエンドビルド

### フロントエンド変更時の追加チェック
- ライトモードで正常表示
- ダークモードで正常表示
- `dark:` プレフィックスの付け忘れがないか

### バックエンド変更時の追加チェック
- `cargo clippy --manifest-path src-tauri/Cargo.toml` — Rust lint
- DBマイグレーション追加時: 既存DBとの互換性確認

### UI変更時の確認ポイント
- デスクトップサイズ（1440px）で正常表示
- タブレットサイズ（768px）で正常表示
- モバイルサイズ（375px）で表示が崩れない
- エラー時の適切なエラーメッセージ表示
