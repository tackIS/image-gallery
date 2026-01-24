import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

/**
 * テーマ管理フック
 * ライト/ダーク/システムテーマの切り替えと永続化を提供します
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // localStorageから初期テーマを取得
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // システムのダークモード設定を検出
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateResolvedTheme = () => {
      let resolved: 'light' | 'dark';

      if (theme === 'system') {
        resolved = mediaQuery.matches ? 'dark' : 'light';
      } else {
        resolved = theme;
      }

      setResolvedTheme(resolved);

      // HTMLにdarkクラスを追加/削除
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateResolvedTheme();

    // システム設定の変更を監視
    mediaQuery.addEventListener('change', updateResolvedTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateResolvedTheme);
    };
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return {
    theme,
    setTheme,
    resolvedTheme,
  };
}
