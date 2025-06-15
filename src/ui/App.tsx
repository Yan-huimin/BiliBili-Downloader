import Header from './components/Header';
import './css/App.css';
import { SetStateAction, useState, useEffect } from 'react';
import { FaGithub } from "react-icons/fa";

function App() {
  const [shareLink, setShareLink] = useState('')
  const [savePath, setSavePath] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [isDarkTheme, setIsDarkTheme] = useState(true)

  if (process.env.NODE_ENV === 'production') {
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && e.key === 'I') || e.key === 'F12') {
      e.preventDefault();
    }
  });
}

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
      console.log('用户取消选择文件夹');
    }
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
      setAlertMessage("下载完成");
      setTimeout(() => setShowAlert(false), 3000);
      setIsDownloading(false);
      setDownloadProgress(0);
    });

    window.electron?.on('download-error', (msg: string) => {
      setAlertMessage(`下载失败:${msg}`);
      setTimeout(() => setShowAlert(false), 3000);
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
      <Header />
      <div className={`w-full h-screen ${themeClasses.container} flex flex-col pt-10 px-4 transition-colors duration-300`}>
        {/* 主题切换按钮 */}
        <div className="fixed top-100 left-85 z-40">
          <button
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

        {/* 警告弹窗 */}
        {showAlert && (
          <div className="fixed top-20 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg
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
            <label className={`block text-xs font-medium ${themeClasses.text}`}>
              分享链接
            </label>
            <input
              type="url"
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
            <label className={`block text-xs font-medium ${themeClasses.text}`}>
              保存地址
            </label>
            <div className="flex space-x-1">
              <input
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
              <div className="space-y-1">
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
            {isDownloading ? '下载中...' : '开始下载'}
          </button>

          {/* 提示信息 */}
          <div className="text-center">
            <div className="space-y-1 text-center mt-2">
              <p className={`${themeClasses.textSecondary} text-xs`}>
                仅支持
                <span className="font-bold font-sans text-blue-500"> BiliBili </span>
                视频下载
              </p>

              <p className={`${themeClasses.textSecondary} text-xs`}>
                <span className="font-bold font-sans text-blue-500">
                  yanhuimin434@gmail.com
                </span>
              </p>

              <p className="text-xs flex justify-center items-center gap-1">
                <span className="font-bold font-sans gradient-text-animate">
                  &copy; 2025 yhm
                </span>
                <a
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