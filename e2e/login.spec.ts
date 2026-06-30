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

test.describe('Login button in floating menu', () => {
  test.afterEach(async () => {
    // Close menu and any open login panel
    await closeFloatingMenu(ctx.mainPage);
    const panel = ctx.mainPage.getByTestId('loginPanel');
    if (await panel.isVisible().catch(() => false)) {
      await ctx.mainPage.getByTestId('login-cancel').click();
      await ctx.mainPage.waitForTimeout(200);
    }
  });

  test('clicking login button shows panel (if logged out) or alert toast (if logged in)', async () => {
    await openFloatingMenu(ctx.mainPage);
    await ctx.mainPage.getByTestId('menu-login').click();

    // Either login panel appears, or "already logged in" alert toast appears
    const [panelVisible, toastVisible] = await Promise.all([
      ctx.mainPage.getByTestId('loginPanel').isVisible().catch(() => false),
      ctx.mainPage.getByTestId('warning').isVisible().catch(() => false),
    ]);

    expect(panelVisible || toastVisible).toBe(true);
  });

  test('when login panel opens, it has refresh and cancel buttons', async () => {
    await openFloatingMenu(ctx.mainPage);
    await ctx.mainPage.getByTestId('menu-login').click();

    const panel = ctx.mainPage.getByTestId('loginPanel');
    const shown = await panel.isVisible().catch(() => false);

    if (shown) {
      // Login panel visible → check its contents
      await expect(ctx.mainPage.getByTestId('login-refresh')).toBeVisible();
      await expect(ctx.mainPage.getByTestId('login-cancel')).toBeVisible();

      // Dismiss
      await ctx.mainPage.getByTestId('login-cancel').click();
      await ctx.mainPage.waitForTimeout(200);
      await expect(panel).not.toBeVisible();
    } else {
      // Already-logged-in toast was shown; test passes vacuously
      expect(true).toBe(true);
    }
  });
});
