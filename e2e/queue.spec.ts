import { test, expect } from '@playwright/test';
import {
  setupSuite,
  teardownSuite,
  openFloatingMenu,
  type E2eContext,
} from './helpers';

let ctx: E2eContext;

test.beforeAll(async () => {
  ctx = await setupSuite();
});

test.afterAll(async () => {
  await teardownSuite(ctx?.electronApp, ctx?.userDataPath);
});

test.describe('Download queue panel', () => {
  test.beforeEach(async () => {
    await openFloatingMenu(ctx.mainPage);
    await ctx.mainPage.getByTestId('menu-queue').click();
    await ctx.mainPage.waitForTimeout(200);
    await expect(ctx.mainPage.getByTestId('queuePanel')).toBeVisible();
  });

  test.afterEach(async () => {
    // Close queue if still open
    const panel = ctx.mainPage.getByTestId('queuePanel');
    if (await panel.isVisible().catch(() => false)) {
      await ctx.mainPage.getByTestId('queue-close').click();
      await ctx.mainPage.waitForTimeout(200);
    }
  });

  test('shows empty state', async () => {
    const emptyEl = ctx.mainPage.getByTestId('queue-empty');
    await expect(emptyEl).toBeVisible();
    await expect(emptyEl).toHaveText('当前并无下载视频');
  });

  test('clear button is disabled when queue is empty', async () => {
    await expect(ctx.mainPage.getByTestId('queue-clear')).toBeDisabled();
  });

  test('close button dismisses the panel', async () => {
    await ctx.mainPage.getByTestId('queue-close').click();
    await ctx.mainPage.waitForTimeout(200);
    await expect(ctx.mainPage.getByTestId('queuePanel')).not.toBeVisible();
  });
});
