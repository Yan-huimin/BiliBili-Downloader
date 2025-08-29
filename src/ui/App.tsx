import Header from './components/Header';
import './css/App.css';
import { SetStateAction, useState, useEffect } from 'react';
import { FaGithub } from "react-icons/fa";
import confetti from 'canvas-confetti';
import LoginBili from './components/LoginBili';
import { electron } from 'process';

function App() {
  const [shareLink, setShareLink] = useState('')
  const [savePath, setSavePath] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [showLogin, setShowLogin] = useState(false);
  const [loginStatus, setLoginStatus] = useState(false);

  if (process.env.NODE_ENV === 'production') {
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && e.key === 'I') || e.key === 'F12') {
      e.preventDefault();
    }
  });
}

  const handleLoginStatusChange = (status: boolean) => {
    setLoginStatus(status);
  };

  const showAlertMessage = (message: SetStateAction<string>) => {
    setAlertMessage(message)
    setShowAlert(true)
    setTimeout(() => setShowAlert(false), 3000)
  }

  const handleFolderSelect = async () => {
    try {
      const path = await window.electron.setVideoFolder();
      setSavePath(path);
    } catch (error) {
      showAlertMessage('用户取消选择文件夹');
    }
  }

  const handleNotification = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  }

const startDownload = async (link: string): Promise<boolean> => {
  if(isDownloading)  return false;

  const fileExists = await window.electron.checkFileExist(savePath) === "YES";

  if (link.length <= 0 || !fileExists) {
    setAlertMessage("下载失败,请检查文件路径或链接");
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
    setDownloadProgress(0);
    setIsDownloading(false);
    return false;
  }

  window.electron.startDownload({
    url: link,
    filePath: savePath,
  });

  return true;
};

  useEffect(() => {
    window.electron.onDownloadProgress((percent) => {
      setDownloadProgress(percent * 100);
    });

    //@ts-ignore
    window.electron?.on('download-complete', (filePath: string) => {
      showAlertMessage("下载完成");
      setIsDownloading(false);
      setDownloadProgress(0);
      window.electron.sendSuccessInfo({
        types: '下载成功',
        message: `文件已下载到: ${filePath}`
      });
      confetti({
        particleCount: 150,
        spread: 30,
        origin: {y: 0.8},
      })
    });

    window.electron?.on('download-error', (msg: string) => {
      console.log(msg);
      showAlertMessage(`下载失败:${msg}`);
      setIsDownloading(false);
      setDownloadProgress(0);
    });
  }, []);

  const handleDownload = async () => {
    // 验证输入
    if (!shareLink.trim()) {
      showAlertMessage('请输入分享链接')
      return
    }
    if (!savePath.trim()) {
      showAlertMessage('请输入保存地址')
      return
    }

    // 开始下载
    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      const res = await window.electron.sendLinkAndDownloadMp4(shareLink);
      console.log(res);
      if(res === null)  {
        showAlertMessage("下载失败...");
        setIsDownloading(false);
        setDownloadProgress(0);
        return;
      }

      await startDownload(res);
    } catch (error) {
      showAlertMessage("下载失败...");
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }

  const themeClasses = isDarkTheme ? {
    container: 'bg-gray-900',
    card: 'bg-gray-800',
    input: 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500',
    button: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
    text: 'text-gray-300',
    textSecondary: 'text-gray-400',
    progressBg: 'bg-gray-700'
  } : {
    container: 'bg-gray-50',
    card: 'bg-white',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 hover:border-gray-400',
    button: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
    text: 'text-gray-700',
    textSecondary: 'text-gray-500',
    progressBg: 'bg-gray-200'
  }

  return (
    <>
      <Header isActive={loginStatus} />
      <div className={`w-full h-screen ${themeClasses.container} flex flex-col pt-10 px-4 transition-colors duration-300`}>
        {/* 主题切换按钮 */}
        <div className="fixed top-90 left-85 z-40" data-testid="changeModeContainer">
          <button
            data-testid='changeModeBtn'
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className={`p-2 cursor-pointer rounded-lg ${themeClasses.button} transition-all duration-200 hover:scale-105 shadow-lg`}
            title={isDarkTheme ? '切换到日间主题' : '切换到暗黑主题'}
          >
            {isDarkTheme ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>

        {/* 设置按键 */}
        <div className="fixed top-100 left-85 z-40" data-testid="changeModeContainer">
          <button
            className={`p-2 cursor-pointer rounded-lg ${themeClasses.button} transition-all duration-200 hover:scale-105 shadow-lg`}
            title={"设置"}
            onClick={() => setShowLogin(true)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* 设置弹窗 */}
        {showLogin && (
          <LoginBili
            visible={showLogin}
            onClose={() => setShowLogin(false)}
            setLoginstatus={() => handleLoginStatusChange(true)}
            LoginSuccessNotic={() => handleNotification('登录成功')}
          />
        )}

        {/* 警告弹窗 */}
        {showAlert && (
          <div data-testid="warning" className="fixed top-20 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg
                         transform transition-all duration-300 animate-bounce z-10000">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>{alertMessage}</span>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex items-center justify-center">
          <div className={`w-full max-w-md p-8 ${themeClasses.card} rounded-2xl shadow-2xl border transition-colors duration-300 ${isDarkTheme ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="space-y-6">
          {/* 分享链接输入 */}
          <div className='space-y-1'>
            <label className={`block text-xs font-medium ${themeClasses.text}`} data-testid="shareLinkLabel">
              分享链接
            </label>
            <input
              type="url"
              data-testid="shareLink"
              name="shareLink"
              value={shareLink}
              onChange={(e) => setShareLink(e.target.value)}
              placeholder="请输入分享链接..."
              maxLength={500}
              required
              className={`w-full px-3 py-2 text-sm ${themeClasses.input} border rounded-md 
                         focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200`}
            />
          </div>

          {/* 保存地址输入 */}
          <div className='space-y-1'>
            <label className={`block text-xs font-medium ${themeClasses.text}`} data-testid="folderAddreeLabel">
              保存地址
            </label>
            <div className="flex space-x-1">
              <input
                data-testid="folderAddress"
                type="text"
                name="savePath"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                placeholder="请输入保存路径..."
                maxLength={200}
                required
                className={`flex-1 px-3 py-2 text-sm ${themeClasses.input} border rounded-md 
                           focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent
                           transition-all duration-200`}
              />
              <button
                data-testid="chooseFolderBtn"
                onClick={handleFolderSelect}
                className={`px-2 py-2 ${themeClasses.button} border rounded-md 
                           transition-all duration-200 hover:scale-105 focus:outline-none cursor-pointer
                           focus:ring-1 focus:ring-blue-500 ${isDarkTheme ? 'border-gray-600' : 'border-gray-300'}`}
                title="选择文件夹"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </button>
            </div>
          </div>

          {/* 进度条 - 紧凑版本 */}
          <div className="h-3 flex flex-col justify-center">
            {isDownloading ? (
              <div className="space-y-1" id='progressBar'>
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${themeClasses.text}`}>下载进度</span>
                  <span className={`text-xs ${themeClasses.textSecondary}`}>{Math.round(downloadProgress)}%</span>
                </div>
                <div className={`w-full ${themeClasses.progressBg} rounded-full h-1.5 overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* 下载按钮 */}
          <button
            data-testid="downloadBtn"
            onClick={handleDownload}
            disabled={isDownloading}
            className={`w-full py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-200 
                       focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer
                       ${isDarkTheme ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'} ${
              isDownloading 
                ? `${isDarkTheme ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'} cursor-not-allowed` 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transform hover:scale-105 hover:shadow-md active:scale-95'
            }`}
          >
            {isDownloading ? (
              <>
              <span className='flex items-center justify-center gap-2'>
                <div className='h-2 w-2 bg-blue-500 animate-bounce rounded-full [animation-delay:-0.3s]'></div>
                <div className='h-2 w-2 bg-blue-500 animate-bounce rounded-full [animation-delay:-0.15s]'></div>
                <div className='h-2 w-2 bg-blue-500 animate-bounce rounded-full'></div>
              </span>

              </>
          ) : '开始下载'}
          </button>

          {/* 提示信息 */}
          <div className="text-center">
            <div className="space-y-1 text-center mt-2">
              <p className={`${themeClasses.textSecondary} text-xs`} data-testid="firstInfo">
                仅支持
                <span className="font-bold font-sans text-blue-500"> BiliBili </span>
                视频下载
              </p>

              <p className={`${themeClasses.textSecondary} text-xs`} data-testid="secondInfo">
                <span className="font-bold font-sans text-blue-500">
                  yanhuimin434@gmail.com
                </span>
              </p>

              <p className="text-xs flex justify-center items-center gap-1" data-testid="thirdInfo">
                <span className="font-bold font-sans gradient-text-animate">
                  &copy; 2025 yhm
                </span>
                <a
                  data-testid="authorLink"
                  href="https://github.com/Yan-huimin"
                  target="_blank"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electron.openPage("https://github.com/Yan-huimin");
                  }}
                  rel="noopener noreferrer"
                  className="ml-1"
                >
                  <FaGithub className="w-4 h-4 text-gray-600 hover:text-black transition-colors duration-200" />
                </a>
              </p>

            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App