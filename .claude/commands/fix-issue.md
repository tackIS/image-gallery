---
description: Issueの対応を開始する（ブランチ作成・方針説明）
argument: Issue番号（例: 42）
---

# Issue 対応開始

指定された Issue の対応を開始します。

## 手順

1. `gh issue view $ARGUMENTS` で Issue の内容を確認
2. Issue の種類に応じたブランチを作成:
   - バグ修正: `fix/issue-$ARGUMENTS-<短い説明>`
   - 機能追加: `feature/issue-$ARGUMENTS-<短い説明>`
   - 改善/リファクタリング: `fix/issue-$ARGUMENTS-<短い説明>`

3. ブランチ作成:
```bash
git checkout main
git pull
git checkout -b <ブランチ名>
```

4. Issue の内容を分析して、修正方針を説明:
   - 影響を受けるファイル
   - 変更の概要
   - 注意点

5. ユーザーの承認を得てから実装を開始
