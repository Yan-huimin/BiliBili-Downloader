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

test.describe('Floating actions menu', () => {
  test.afterEach(async () => {
    // Ensure menu is closed after each test for a clean slate
    await closeFloatingMenu(ctx.mainPage);
  });

  test('menu opens on trigger click', async () => {
    await ctx.mainPage.getByTestId('changeModeBtn').click();
    await expect(ctx.mainPage.getByTestId('floatingMenu')).toBeVisible();
  });

  test('menu closes on outside click', async () => {
    await openFloatingMenu(ctx.mainPage);
    await ctx.mainPage.mouse.click(5, 5);
    await expect(ctx.mainPage.getByTestId('floatingMenu')).not.toBeVisible();
  });

  test('always-visible menu items are present (queue, theme, time, login, settings)', async () => {
    await openFloatingMenu(ctx.mainPage);

    await expect(ctx.mainPage.getByTestId('menu-queue')).toBeVisible();
    await expect(ctx.mainPage.getByTestId('menu-theme')).toBeVisible();
    await expect(ctx.mainPage.getByTestId('menu-time')).toBeVisible();
    await expect(ctx.mainPage.getByTestId('menu-login')).toBeVisible();
    await expect(ctx.mainPage.getByTestId('menu-settings')).toBeVisible();
  });

  test('theme toggle changes data-theme attribute', async () => {
    await openFloatingMenu(ctx.mainPage);
    const appShell = ctx.mainPage.locator('.app-shell');
    const before = await appShell.getAttribute('data-theme');

    // Click theme toggle — this also closes the menu via closeAfterAction
    await ctx.mainPage.getByTestId('menu-theme').click();
    await ctx.mainPage.waitForTimeout(300); // wait for menu exit animation

    const after = await appShell.getAttribute('data-theme');
    expect(after).not.toBe(before);
  });

  test('click time button shows alert toast with current time', async () => {
    await openFloatingMenu(ctx.mainPage);
    await ctx.mainPage.getByTestId('menu-time').click();
    // menu closes via closeAfterAction; toast should appear
    await ctx.mainPage.waitForTimeout(300);

    const toast = ctx.mainPage.getByTestId('warning');
    await expect(toast).toBeVisible();
    expect(await toast.textContent()).toContain('当前时间');
  });
});
