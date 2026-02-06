---
description: Pull Requestを作成する
---

# Pull Request 作成

現在のブランチの変更をもとに PR を作成します。

## 手順

1. 変更の分析:
```bash
git log main..HEAD --oneline
git diff main...HEAD --stat
```

2. 以下のフォーマットで PR を作成:
```bash
gh pr create --title "<type>: <タイトル>" --body "$(cat <<'EOF'
## 概要
<1-3行で変更の目的>

## 変更内容
<変更ファイルと内容の箇条書き>

## テスト
- [ ] `npm run build` 成功
- [ ] `npm run lint` 成功
- [ ] `cargo check` 成功
- [ ] ライトモード / ダークモード確認
- [ ] 動作確認済み

## 関連Issue
Closes #<N>（該当する場合）
EOF
)" --base main
```

3. 作成した PR の URL を報告
