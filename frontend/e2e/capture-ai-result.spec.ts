import { expect, test } from '@playwright/test';

test.describe('Capture AI result screen', () => {
  test('chemical detail AI tab with generated report', async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto('http://127.0.0.1:7000/chemical/001008', {
      waitUntil: 'domcontentloaded',
    });

    const aiTab = page.getByRole('button', { name: /AI/i }).first();
    await expect(aiTab).toBeVisible({ timeout: 60_000 });
    await aiTab.click();

    const generateButton = page.getByRole('button', { name: /Generate AI Report/i });
    await expect(generateButton).toBeVisible({ timeout: 30_000 });
    await generateButton.click();

    const analysisHeader = page.getByRole('heading', { name: /AI Safety & Market Analysis/i });
    await expect(analysisHeader).toBeVisible({ timeout: 30_000 });

    const confidenceLabel = page.getByText(/Confidence:/i);
    await expect(confidenceLabel).toBeVisible({ timeout: 90_000 });

    await page.screenshot({
      path: '../docs/screenshots/proposal_20260302/06_result_ai_insight.png',
      fullPage: true,
    });
  });
});
