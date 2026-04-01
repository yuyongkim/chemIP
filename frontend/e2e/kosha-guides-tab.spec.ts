import { expect, test } from '@playwright/test';

test.describe('Chemical detail KOSHA guides tab', () => {
  test('renders and opens guides panel', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('http://127.0.0.1:7000/chemical/001008', {
      waitUntil: 'domcontentloaded',
    });

    const guidesTab = page.getByRole('button', { name: /KOSHA Guides/i });
    await expect(guidesTab).toBeVisible({ timeout: 60_000 });
    await guidesTab.click();

    const guidesPanelTitle = page.getByRole('heading', { name: /Related KOSHA Guides/i });
    await expect(guidesPanelTitle).toBeVisible({ timeout: 30_000 });

    await page.screenshot({
      path: '../docs/screenshots/runtime_check_20260301/07_chemical_kosha_guides_tab.png',
      fullPage: true,
    });
  });
});
