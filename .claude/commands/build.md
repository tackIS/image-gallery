---
description: ビルドと全チェックを実行する
---

# ビルド＆チェック

すべてのチェックを順次実行し、結果をサマリーで報告します。

## 実行するチェック

以下を順番に実行:

1. **TypeScript型チェック**: `npx tsc --noEmit`
2. **ESLint**: `npm run lint`
3. **Rust チェック**: `cargo check --manifest-path src-tauri/Cargo.toml`
4. **フロントエンドビルド**: `npm run build`

## 報告フォーマット

すべて完了したら、以下のようにサマリーを報告:

```
## ビルド結果

| チェック | 結果 |
|----------|------|
| TypeScript | ✅ / ❌ |
| ESLint | ✅ / ❌ |
| Cargo check | ✅ / ❌ |
| Build | ✅ / ❌ |
```

エラーがあれば内容と修正提案を含める。
