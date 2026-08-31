import { test, expect } from '@playwright/test';
import { setupSuite, teardownSuite, type E2eContext } from './helpers';

let ctx: E2eContext;

test.beforeAll(async () => {
  ctx = await setupSuite();
});

test.afterAll(async () => {
  await teardownSuite(ctx?.electronApp, ctx?.userDataPath);
});

test.describe('Download panel — static UI', () => {
  test('brand section renders', async () => {
    await expect(ctx.mainPage.getByText('BiliDownload')).toBeVisible();
    await expect(ctx.mainPage.getByRole('heading', { name: '视频下载' })).toBeVisible();
  });

  test('share link input is visible and initially empty', async () => {
    const input = ctx.mainPage.getByTestId('shareLink');
    await expect(input).toBeVisible();
    await expect(input).toBeEmpty();
  });

  test('save path input is visible and non-empty (loaded from settings)', async () => {
    const input = ctx.mainPage.getByTestId('folderAddress');
    await expect(input).toBeVisible();
    // Settings.json persists the last download path — it won't be empty
    const value = await input.inputValue();
    expect(value).toBeTruthy();
  });

  test('action buttons are visible', async () => {
    await expect(ctx.mainPage.getByTestId('chooseFolderBtn')).toBeVisible();
    await expect(ctx.mainPage.getByTestId('downloadBtn')).toBeVisible();
    await expect(ctx.mainPage.getByTestId('downloadBtn')).toHaveText('开始下载');
  });

  test('footer info is visible', async () => {
    await expect(ctx.mainPage.getByText('仅支持')).toBeVisible();
    await expect(ctx.mainPage.getByText('yanhuimin434@gmail.com')).toBeVisible();
    await expect(ctx.mainPage.getByText('© 2025 yhm')).toBeVisible();
  });
});

test.describe('Download panel — validation', () => {
  test('empty inputs → error toast', async () => {
    // Ensure inputs are empty
    await ctx.mainPage.getByTestId('shareLink').clear();
    await ctx.mainPage.getByTestId('folderAddress').clear();
    await ctx.mainPage.getByTestId('downloadBtn').click();

    const toast = ctx.mainPage.getByTestId('warning');
    await expect(toast).toBeVisible();
    expect(await toast.textContent()).toContain('请输入分享链接');
  });

  test('empty path → path error', async () => {
    await ctx.mainPage.getByTestId('shareLink').fill('https://www.bilibili.com/video/BV1xx411c7mD');
    await ctx.mainPage.getByTestId('folderAddress').clear();
    await ctx.mainPage.getByTestId('downloadBtn').click();

    const toast = ctx.mainPage.getByTestId('warning');
    await expect(toast).toBeVisible();
    expect(await toast.textContent()).toContain('请输入保存地址');
  });

  test('malformed URL → validation error', async () => {
    await ctx.mainPage.getByTestId('shareLink').fill('not-a-valid-link');
    await ctx.mainPage.getByTestId('folderAddress').fill('C:\\test');
    await ctx.mainPage.getByTestId('downloadBtn').click();

    const toast = ctx.mainPage.getByTestId('warning');
    await expect(toast).toBeVisible();
    expect(await toast.textContent()).toContain('无法识别');
  });

  test('valid BV URL + path → added to queue', async () => {
    await ctx.mainPage.getByTestId('shareLink').fill('https://www.bilibili.com/video/BV1xx411c7mD');
    await ctx.mainPage.getByTestId('folderAddress').fill('C:\\test');
    await ctx.mainPage.getByTestId('downloadBtn').click();

    const toast = ctx.mainPage.getByTestId('warning');
    await expect(toast).toBeVisible();
    expect(await toast.textContent()).toContain('已添加到下载队列');
  });
});
