# Claude Code設定の整備計画

## コンテキスト

Image Gallery Manager（Tauri v2 + React + Rust）の開発において、Claude Codeの設定を体系的に整備する。CLAUDE.mdの冗長な内容をモジュラールールに分離し、カスタムコマンド・エージェントを追加して開発効率を向上させる。

## 変更サマリー

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| CLAUDE.md | 418行（全部入り） | ~100行（要点のみ） |
| `.claude/rules/` | なし | 4ファイル（領域別ルール） |
| `.claude/settings.json` | なし | 共有設定（権限+フック） |
| `.claude/settings.local.json` | 54エントリ（コミットメッセージ埋め込み） | 最小限（ローカル固有のみ） |
| `.claude/commands/` | なし | 6コマンド |
| `.claude/agents/` | なし | 2エージェント |

## 作成ファイル一覧

```
.claude/
  settings.json                  # 共有設定（権限+通知フック）
  settings.local.json            # ローカル固有（最小化）
  commands/
    issue.md                     # /issue - GitHub Issue作成
    fix-issue.md                 # /fix-issue - Issue対応開始
    pr.md                        # /pr - PR作成
    dev.md                       # /dev - 開発サーバー起動
    build.md                     # /build - ビルド＆チェック
    review.md                    # /review - 変更レビュー
  agents/
    rust-expert.md               # Rust/Tauri専門エージェント
    ui-reviewer.md               # UIレビュー専門エージェント
  rules/
    frontend-react.md            # React/TypeScript規約
    frontend-styling.md          # Tailwind v4/ダークモード
    backend-rust.md              # Rust/Tauri/SQLite規約
    testing.md                   # テストチェックリスト
CLAUDE.md                        # スリム化（418行→~100行）
```

## CLAUDE.mdのスリム化方針

### 残した内容
- プロジェクト概要（1文）
- 技術スタック（箇条書き）
- プロジェクト構造（簡略版）
- Tailwind v4の重要注意（最重要の"落とし穴"）
- 開発コマンド一覧
- コミット規約（type一覧のみ）
- コーディング規約（要点のみ）

### rulesに移動した内容
- 詳細なCSS構文例 → `rules/frontend-styling.md`
- DBスキーマ・操作 → `rules/backend-rust.md`
- Tauri API使用例 → `rules/backend-rust.md`
- 状態管理パターン → `rules/frontend-react.md`
- テストチェックリスト → `rules/testing.md`

### 削除した内容
- 「Claude Codeとの協働のコツ」セクション（人間向けガイド）
- 詳細なワークフロー例（コマンドで代替）
- トラブルシューティング（rulesに統合）
- 更新履歴
- 参考リンク
