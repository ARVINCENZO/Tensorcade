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

  test('Replay viewer story matches baseline snapshot at integer scale', async ({ page }, testInfo) => {
    await page.goto('/iframe.html?id=simulation-replayviewer--default&viewMode=story');
    await page.waitForLoadState('networkidle');

    const snapshotPath = testInfo.snapshotPath('replay-viewer-default.png');
    if (!fs.existsSync(snapshotPath)) {
      test.skip(
        process.env.CI === 'true' && process.env.UPDATE_SNAPSHOTS !== 'true',
        `Baseline snapshot not yet committed at ${snapshotPath}. Run CI with update_snapshots=true or generate in container.`,
      );
    }

    await expect(page).toHaveScreenshot('replay-viewer-default.png', {
      fullPage: true,
    });
  });
});
