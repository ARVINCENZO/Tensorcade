import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test.describe('Visual Regression Testing (VRT)', () => {
  test('World map route matches baseline snapshot', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const snapshotPath = testInfo.snapshotPath('world-map.png');
    if (!fs.existsSync(snapshotPath)) {
      test.skip(
        process.env.CI === 'true' && process.env.UPDATE_SNAPSHOTS !== 'true',
        `Baseline snapshot not yet committed at ${snapshotPath}. Run CI with update_snapshots=true or generate in container.`,
      );
    }

    await expect(page).toHaveScreenshot('world-map.png', {
      fullPage: true,
    });
  });

  test('Level 1.1 route matches baseline snapshot at integer scale', async ({ page }, testInfo) => {
    const snapshotPath = testInfo.snapshotPath('level-1-1.png');
    if (!fs.existsSync(snapshotPath)) {
      test.skip(
        process.env.CI === 'true' && process.env.UPDATE_SNAPSHOTS !== 'true',
        `Baseline snapshot not yet committed at ${snapshotPath}. Run CI with update_snapshots=true or generate in container.`,
      );
    }

    await page.goto('/level/w1-robot-farm-1.1');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('level-player').waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('level-1-1.png', {
      fullPage: true,
    });
  });
});
