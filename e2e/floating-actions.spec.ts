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
  await teardownSuite(ctx?.electronApp, ctx?.userDataPath);
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

  test('always-visible menu items are present (queue, theme, history, login, settings)', async () => {
    await openFloatingMenu(ctx.mainPage);

    await expect(ctx.mainPage.getByTestId('menu-queue')).toBeVisible();
    await expect(ctx.mainPage.getByTestId('menu-theme')).toBeVisible();
    await expect(ctx.mainPage.getByTestId('menu-history')).toBeVisible();
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

  test('history button opens the download history panel', async () => {
    await openFloatingMenu(ctx.mainPage);
    await ctx.mainPage.getByTestId('menu-history').click();
    await expect(ctx.mainPage.getByTestId('history-panel')).toBeVisible();
  });
});
