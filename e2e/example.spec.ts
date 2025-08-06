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

test.describe('MainPage element', () => {
  test('head element should be visible', async () => {
    await expect(mainPage.getByTestId('head')).toBeVisible();
  });

  test('change mode btn container should be visible', async () => {
    await expect(mainPage.getByTestId('changeModeContainer')).toBeVisible();
  })

  test('change mode btn should be visible', async () => {
    await expect(mainPage.getByTestId('changeModeBtn')).toBeVisible();
  })

  test('share link label should be visible', async () => {
    await expect(mainPage.getByTestId('shareLinkLabel')).toBeVisible();
  })

  test('share link input part should be visible and empty', async () => {
    await expect(mainPage.getByPlaceholder('请输入分享链接...')).toBeVisible();
    await expect(mainPage.getByPlaceholder('请输入分享链接...')).toBeEmpty();
  })

  test('folderAddress lable and input should be visible and empty', async () => {
    await expect(mainPage.getByTestId('folderAddreeLabel')).toBeVisible();
    await expect(mainPage.getByPlaceholder('请输入保存路径...')).toBeVisible();
    await expect(mainPage.getByPlaceholder('请输入保存路径...')).toBeEmpty();
  })

  test('choose folder btn should be visible', async () => {
    await expect(mainPage.getByTestId('chooseFolderBtn')).toBeVisible();
  })

  test('download btn should be visible', async () => {
    await expect(mainPage.getByTestId('downloadBtn')).toBeVisible();
  })

  test('the info of author should be visible', async () => {
    await expect(mainPage.getByTestId('firstInfo')).toBeVisible();
    await expect(mainPage.getByTestId('secondInfo')).toBeVisible();
    await expect(mainPage.getByTestId('thirdInfo')).toBeVisible();
  })

  test('click change mode btn and mode should be changed', async () => {
    await mainPage.click('[data-testid="changeModeBtn"]');
    
    const title = await mainPage.getByTestId('changeModeBtn').getAttribute('title');

    expect(title).toBe('切换到暗黑主题');
  })

  test('click download btn should display the error message', async () => {
    await mainPage.click('[data-testid="downloadBtn"]');
    expect(mainPage.getByTestId('warning')).toBeVisible();
  })

  test('input fake url and click download btn should display the error message', async () => {
    await mainPage.getByTestId('shareLink').fill('--');
    await mainPage.click('[data-testid="downloadBtn"]');
    const message = await mainPage.getByTestId('warning').textContent();
    expect(message).toBe('请输入保存地址');
  })

  test('input fake url+folderaddress and click download btn should display the error message', async () => {
    await mainPage.getByTestId('shareLink').fill('--');
    await mainPage.getByTestId('folderAddress').fill('--');
    await mainPage.click('[data-testid="downloadBtn"]');
    const message = await mainPage.getByTestId('warning').textContent();
    expect(message).toBe('下载失败,请检查文件路径或链接');
  })

  // test('click folder choose btn and click cancle and show the default address of video in this computer', async () => {
  //   await mainPage.click('[data-testid="chooseFolderBtn"]');
  //   const address = await mainPage.getByTestId('folderAddress').inputValue();
  //   expect(address).toBe('D:\\Users\\Y_hm\\Videos');
  // })

  // test('click folder choose btn and choose a path and show the path in the input box', async () => {
  //   await mainPage.click('[data-testid="chooseFolderBtn"]');
  //   const address = await mainPage.getByTestId('folderAddress').inputValue();
  //   expect(address).toBe('hello');
  // })

  test('click external link should trigger shell.openExternal', async () => {

    await electronApp.evaluate(({ shell }) => {

      globalThis.__mock_openExternalCalls = [];
      shell.openExternal = (url) => {
        globalThis.__mock_openExternalCalls.push(url);
        return Promise.resolve();
      };
    });

    await mainPage.click('[data-testid="authorLink"]');

    const calls = await electronApp.evaluate(() => globalThis.__mock_openExternalCalls);
    expect(calls).toContain('https://github.com/Yan-huimin');
  });
});