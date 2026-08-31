import { expect, _electron, Page } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Wait for the preload script to expose `window.electron` on the renderer page.
 * Times out after `timeoutMs` instead of hanging forever.
 */
export async function waitForPreloadScript(
  page: Page,
  timeoutMs = 10_000,
): Promise<void> {
  await page.waitForFunction(
    () => (window as Window & { electron?: unknown }).electron !== undefined,
    null,
    { timeout: timeoutMs },
  );
}

export interface E2eContext {
  electronApp: Awaited<ReturnType<typeof _electron.launch>>;
  mainPage: Page;
  userDataPath: string;
}

/**
 * Launch the Electron app once per spec file. Use in `beforeAll`.
 */
export async function setupSuite(): Promise<E2eContext> {
  const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'bilidownload-e2e-'));
  try {
    await writeFile(
      path.join(userDataPath, 'Settings.json'),
      JSON.stringify({
        videoQuality: 64,
        downloadPath: process.cwd(),
        systemNotification: false,
        fireworkParticles: false,
        closeBehavior: 'quit',
      }),
      'utf-8',
    );
    const electronApp = await _electron.launch({
      args: ['.'],
      env: {
        NODE_ENV: 'development',
        HTTP_PROXY: '',
        HTTPS_PROXY: '',
        http_proxy: '',
        https_proxy: '',
        NO_PROXY: 'localhost,127.0.0.1,::1',
        no_proxy: 'localhost,127.0.0.1,::1',
        BILIDOWNLOAD_E2E_USER_DATA_DIR: userDataPath,
      },
    });
    const mainPage = await electronApp.firstWindow();
    await waitForPreloadScript(mainPage);
    return { electronApp, mainPage, userDataPath };
  } catch (error) {
    await rm(userDataPath, { force: true, recursive: true }).catch(() => {});
    throw error;
  }
}

/**
 * Close the Electron app once per spec file. Use in `afterAll`.
 */
export async function teardownSuite(
  electronApp: Awaited<ReturnType<typeof _electron.launch>> | undefined,
  userDataPath?: string,
): Promise<void> {
  try {
    if (electronApp) {
      await Promise.race([
        electronApp.close().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    }
  } finally {
    if (userDataPath) {
      await rm(userDataPath, { force: true, recursive: true }).catch(() => {});
    }
  }
}

/**
 * Opens the floating actions menu. If already open, does nothing.
 * Waits for Framer Motion entry animation (0.16s) to settle.
 */
export async function openFloatingMenu(page: Page): Promise<void> {
  const menu = page.getByTestId('floatingMenu');
  if (await menu.isVisible().catch(() => false)) return;

  await page.getByTestId('changeModeBtn').click();
  await expect(menu).toBeVisible();
  // Let Framer Motion animation finish (0.16s + buffer)
  await page.waitForTimeout(250);
}

/**
 * Close the floating actions menu by clicking outside. No-op if already closed.
 */
export async function closeFloatingMenu(page: Page): Promise<void> {
  const menu = page.getByTestId('floatingMenu');
  if (!(await menu.isVisible().catch(() => false))) return;

  // Click outside the actions container area
  await page.mouse.click(5, 5);
  await expect(menu).not.toBeVisible();
  await page.waitForTimeout(200);
}
