import { test, expect } from '@playwright/test';
import {
  setupSuite,
  teardownSuite,
  openFloatingMenu,
  closeFloatingMenu,
  type E2eContext,
} from './helpers';

let ctx: E2eContext;

test.beforeAll(async () => {
  ctx = await setupSuite();
});

test.afterAll(async () => {
  await teardownSuite(ctx?.electronApp);
});

test.describe('Settings panel', () => {
  test.beforeEach(async () => {
    // Open settings cleanly
    await openFloatingMenu(ctx.mainPage);
    await ctx.mainPage.getByTestId('menu-settings').click();
    await ctx.mainPage.waitForTimeout(200);
    await expect(ctx.mainPage.getByTestId('settingsPanel')).toBeVisible();
  });

  test.afterEach(async () => {
    // Close settings if still open (save or close button dismisses it)
    const panel = ctx.mainPage.getByTestId('settingsPanel');
    if (await panel.isVisible().catch(() => false)) {
      await ctx.mainPage.getByTestId('settings-close').click();
      await ctx.mainPage.waitForTimeout(200);
    }
  });

  test('has all four sections', async () => {
    await expect(ctx.mainPage.getByRole('heading', { name: '清晰度' })).toBeVisible();
    await expect(ctx.mainPage.getByRole('heading', { name: '其他设置' })).toBeVisible();
    await expect(ctx.mainPage.getByRole('heading', { name: '开发者工具' })).toBeVisible();
    await expect(ctx.mainPage.getByRole('heading', { name: '默认下载路径' })).toBeVisible();
  });

  test('notification and firework toggles are present', async () => {
    await expect(ctx.mainPage.getByTestId('settings-notification')).toBeVisible();
    await expect(ctx.mainPage.getByTestId('settings-firework')).toBeVisible();
  });

  test('devtools button is present', async () => {
    await expect(ctx.mainPage.getByTestId('settings-devtools')).toBeVisible();
  });

  test('default download path is non-empty', async () => {
    const pathEl = ctx.mainPage.getByTestId('settings-path');
    await expect(pathEl).toBeVisible();
    expect(await pathEl.textContent()).toBeTruthy();
  });

  test('close button dismisses the settings panel', async () => {
    await ctx.mainPage.getByTestId('settings-close').click();
    await ctx.mainPage.waitForTimeout(200);
    await expect(ctx.mainPage.getByTestId('settingsPanel')).not.toBeVisible();
  });

  test('save button dismisses the settings panel', async () => {
    await ctx.mainPage.getByTestId('settings-save').click();
    await ctx.mainPage.waitForTimeout(200);
    await expect(ctx.mainPage.getByTestId('settingsPanel')).not.toBeVisible();
  });
});
