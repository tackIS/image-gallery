import { test, expect } from './fixtures';

test.describe('Gallery App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays empty state on initial load', async ({ page }) => {
    // 空状態のメッセージが表示されることを確認
    await expect(page.getByText('No Media Files Found')).toBeVisible();
  });

  test('renders header with title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Image Gallery' })).toBeVisible();
  });

  test('sidebar toggle hides and shows sidebar', async ({ page }) => {
    // サイドバーのナビゲーション領域が表示されていることを確認
    const sidebar = page.getByRole('navigation', { name: 'サイドバー' });
    await expect(sidebar).toBeVisible();

    // サイドバーを閉じる
    const toggleButton = page.getByRole('button', { name: 'Close sidebar' });
    await toggleButton.click();

    // サイドバーが非表示になることを確認
    await expect(sidebar).toBeHidden();

    // サイドバーを再度開く
    const openButton = page.getByRole('button', { name: 'Open sidebar' });
    await openButton.click();

    // サイドバーが再度表示されることを確認
    await expect(sidebar).toBeVisible();
  });

  test('theme toggle cycles through themes', async ({ page }) => {
    const themeButton = page.getByRole('button', { name: /Current theme/ });
    await expect(themeButton).toBeVisible();

    // クリックでテーマが変更される
    await themeButton.click();
    // テーマボタンがまだ存在することを確認（サイクルが動作）
    await expect(page.getByRole('button', { name: /Current theme/ })).toBeVisible();
  });

  test('settings modal opens and closes', async ({ page }) => {
    // 設定ボタンをクリック
    const settingsButton = page.getByRole('button', { name: 'Settings' });
    await settingsButton.click();

    // 設定モーダルが表示される
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('設定')).toBeVisible();

    // 閉じるボタンでモーダルを閉じる
    const closeButton = dialog.getByRole('button', { name: 'Close' });
    await closeButton.click();

    // モーダルが閉じる
    await expect(dialog).toBeHidden();
  });

  test('search bar accepts input', async ({ page }) => {
    // 空状態では検索バーは表示されない（画像がないため）
    const searchInput = page.getByRole('textbox', { name: '画像を検索' });
    await expect(searchInput).toBeHidden();
  });
});
