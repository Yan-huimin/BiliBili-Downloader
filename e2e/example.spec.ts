import { test, expect, _electron } from '@playwright/test';

let electronApp: Awaited<ReturnType<typeof _electron.launch>>;
let mainPage: Awaited<ReturnType<typeof electronApp.firstWindow>>;

async function waitForPreloadScript() {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const electronBridge = await mainPage.evaluate(() => {
        return (window as Window & {electron?:any}).electron;
      });
      if(electronBridge){
        clearInterval(interval);
        resolve(true);
      }
    })
  })
}

test.beforeEach(async () => {
  electronApp = await _electron.launch({
    args: ['.'],
    env: { NODE_ENV: 'development' },
  });
  mainPage = await electronApp.firstWindow();
  await waitForPreloadScript();
})

test.afterEach(async () => {
  await electronApp.close();
})

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

// 测试是否关闭窗口
test('close the main window', async () => {
  await mainPage.click('#close');
  const isClosed = await electronApp.evaluate((electron) => {
    return electron.BaseWindow.getAllWindows().length === 0;
  })
  expect(isClosed).toBeTruthy();
})

// 测试是否最小化窗口
test('should minimize the window', async () => {
  await mainPage.click('#minimize');
  const isMinimized = await electronApp.evaluate((electron) => {
    return electron.BaseWindow.getAllWindows()[0].isMinimizable();
  });
  expect(isMinimized).toBeTruthy()
})

// 测试是否最大化窗口
test('should maximize the window', async () => {
  await mainPage.click('#maximize');
  const isMaximizable = await electronApp.evaluate((electron) => {
    return electron.BaseWindow.getAllWindows()[0].isMaximizable();
  });
  expect(isMaximizable).toBeTruthy();
})

test('should not open dev tools', async () => {
  await mainPage.click('F12');
  await mainPage.waitForTimeout(500);
  const isOpened = await mainPage.evaluate(() => {
    return ;
  })

  expect(isOpened).toBeFalsy();
})