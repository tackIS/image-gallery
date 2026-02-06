---
description: Tailwind CSS v4とスタイリング規約
globs:
  - "src/**/*.tsx"
  - "src/**/*.css"
---

# スタイリング規約（Tailwind CSS v4 / ダークモード）

## Tailwind CSS v4（重要）

このプロジェクトは **Tailwind CSS v4** を使用。v3とは構文が異なる。

### v4の正しい構文
```css
@import "tailwindcss";

@theme {
  --color-gray-50: oklch(0.985 0 0);
}

@variant dark (&:where(.dark, .dark *));
```

### v3の構文（使用禁止）
```css
/* これらは使わない */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `src/index.css` の原則
- `@import "tailwindcss"` + `@theme` + `@variant dark` + `body { margin: 0; }` のみ
- グローバルスタイルは最小限に
- `:root`, `button`, `h1` などの固定スタイルは使用しない

## ダークモード対応（必須）

すべての新規コンポーネントはダークモード対応必須。

### 基本パターン
- テキスト: `text-gray-900 dark:text-gray-100`
- 背景: `bg-white dark:bg-gray-800`
- ボーダー: `border-gray-300 dark:border-gray-600`
- ホバー: `hover:bg-gray-100 dark:hover:bg-gray-700`

### 仕組み
- `useTheme` フックで `<html>` に `dark` クラスを付与
- `@variant dark` で `dark:` プレフィックスが有効化

## レスポンシブ対応

主にmacOSデスクトップアプリだが、基本的なレスポンシブ対応を推奨。

### ブレークポイント
- `sm:` 640px+ / `md:` 768px+ / `lg:` 1024px+ / `xl:` 1280px+

### パターン例
```tsx
<button className="px-2 sm:px-4 py-2">
  <Icon size={20} />
  <span className="hidden sm:inline">Button Text</span>
</button>
```

## スタイリング原則
- ユーティリティクラスを優先（インラインスタイルではなくTailwindクラス）
- 色はプロジェクト定義のgrayパレットを使用（`@theme` で定義済み）
