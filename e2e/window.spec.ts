import { test, expect } from '@playwright/test';
import { setupSuite, teardownSuite, type E2eContext } from './helpers';

let ctx: E2eContext;

test.beforeAll(async () => {
  ctx = await setupSuite();
});

test.afterAll(async () => {
  await teardownSuite(ctx?.electronApp, ctx?.userDataPath);
});

test.describe('Window controls', () => {
  test('all three traffic-light buttons are visible', async () => {
    await expect(ctx.mainPage.locator('#close')).toBeVisible();
    await expect(ctx.mainPage.locator('#minimize')).toBeVisible();
    await expect(ctx.mainPage.locator('#maximize')).toBeVisible();
  });

  test('maximize button is disabled (frameless fixed-size window)', async () => {
    await expect(ctx.mainPage.locator('#maximize')).toBeDisabled();
  });
});
