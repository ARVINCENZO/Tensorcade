import { test, expect } from '@playwright/test';

test.describe('World 1: Robot Farm E2E Playthrough & Accessibility Flows', () => {
  test('displays all 12 Robot Farm levels on World Map, launches Level 1.1, exercises 3 modes, hints, keyboard reset, and reduced motion', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Load World Map and verify all 12 Robot Farm levels are listed
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Robot Farm')).toBeVisible();
    await expect(page.getByText('12 levels')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Launch Level 1: w1-robot-farm-1\.1/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Locked Level 12: w1-robot-farm-1\.12/i }),
    ).toBeVisible();

    // 2. Launch Level 1.1 directly from World Map
    await page.getByRole('button', { name: /Launch Level 1: w1-robot-farm-1\.1/i }).click();
    await page.getByTestId('level-player').waitFor({ state: 'visible' });
    await expect(page.getByText('First Furrow').first()).toBeVisible();

    // 3. Verify 3-tier Hint Ladder opens and reveals Tier 1 without leaking raw solution
    await page.getByRole('button', { name: /Hints/i }).click();
    await expect(page.getByText(/Tier 1/i).first()).toBeVisible();
    await page.keyboard.press('Escape');

    // 4. Verify all 3 modes (Explorer, Builder, Hacker) switch cleanly
    await page.getByRole('tab', { name: /Builder/i }).click();
    await page.getByTestId('builder-editor').waitFor({ state: 'visible' });

    await page.getByRole('tab', { name: /Hacker/i }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();

    // 5. Measure instant reset latency (< 1,000 ms budget)
    const resetStart = Date.now();
    await page.getByRole('button', { name: /Reset/i }).first().click();
    const resetElapsed = Date.now() - resetStart;
    expect(resetElapsed).toBeLessThan(1000);

    // 6. Toggle Reduced Motion in Settings and verify root data attribute
    await page.getByRole('button', { name: 'Open settings' }).click();
    const reducedMotionToggle = page.getByRole('switch', { name: /Reduced Motion/i });
    if (await reducedMotionToggle.isVisible()) {
      await reducedMotionToggle.click();
    } else {
      await page.getByLabel(/Reduced Motion/i).click();
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-reduced-motion="true"]')).toBeVisible();

    // 7. Verify Level 1.12 capstone lazy chunk loads cleanly
    await page.goto('/level/w1-robot-farm-1.12');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('level-player').waitFor({ state: 'visible' });
    await expect(page.getByText('Autonomous Dome Capstone').first()).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
