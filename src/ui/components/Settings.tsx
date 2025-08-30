import React, { useState, useRef, useEffect } from 'react';
import defaultImg from '../assets/defaultHead.jpeg';
import '../css/LoginBili.css';
import { IoDiamondOutline } from "react-icons/io5";
import { FaSignOutAlt, FaFolder } from "react-icons/fa";
import { IoCopy } from "react-icons/io5";

interface MyModalProps {
  visible: boolean;
  onClose: () => void;
  setMainPageStatus: () => void;
  noticeSettingsSaved: () => void;
}

const Settings: React.FC<MyModalProps> = ({ visible, onClose, setMainPageStatus, noticeSettingsSaved }) => {
  //@ts-ignore
  const [position, setPosition] = useState({ left: 80, top: 130 }); // 初始位置
  const modalRef = useRef<HTMLDivElement>(null);
  const [loginStatus, setLoginStatus] = useState(false);
  const [userInfo, setUserInfo] = useState({ uname: '未登录', head: 'null', vip: false });
  const [selectedQuality, setSelectedQuality] = useState<number | null>(64); // 默认选中720p
  const [defaultDownloadPath, setDefaultDownloadPath] = useState<string>('C:\\Users\\Username\\Downloadsdsafffffffffffffffffffffff');

  const videoQualityOptions = [
    { label: '360p', qn: 6, text: '360p', vip: false },
    { label: '480p', qn: 32, text: '480p', vip: false },
    { label: '720pgq', qn: 64, text: '720p高清', vip: false },
    { label: '720pgzl', qn: 74, text: '720p高帧率', vip: false },
    { label: '1080p', qn: 80, text: '1080p高清', vip: true },
    { label: '1080pgml', qn: 112, text: '1080p高码率', vip: true },
    { label: '1080p60gzl', qn: 116, text: '1080p60高帧率', vip: true },
    { label: '4k', qn: 120, text: '4k', vip: true },
  ];

    const selectQuality = (qn: number) => {
        setSelectedQuality(qn);
    };

    const handleFolderSelect = async () => {
        try {
        const path = await window.electron.setVideoFolder();
        setDefaultDownloadPath(path);
        } catch (error) {
        throw new Error(
            'err:' + error
        );
        }
    }

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await window.electron.loadSettings();
      console.log(settings);
      setSelectedQuality(settings.videoQuality);
      setDefaultDownloadPath(settings.downloadPath);
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose(); // 如果点击的是组件外部，关闭模态框
        }
    };

    const fetchUserInfo = async () => {
      const info = await window.biliApi.getUserInfo();
      setLoginStatus(info.isLogin);
      setUserInfo({ uname: info.uname, head: info.face, vip: info.vipStatus === 1 });
    };

    if (visible) {
        document.addEventListener('mousedown', handleClickOutside);
        fetchUserInfo();
    } else {
        document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
    }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={modalRef}
      className="fixed bg-black/60 rounded-lg p-2 flex flex-col
      z-50 rounded-lg gap-4"
      style={{ left: position.left - 45, top: position.top - 45 }}
    >
      <div className='flex-col overflow-y-auto w-80 h-80 flex flex-col custom-scrollbar'>
        <div className="userinfo flex flex-row items-center gap-4 p-2">
            <img className='w-12 h-12 rounded-full select-none pointer-events-none' src={loginStatus && userInfo.head ? userInfo.head : defaultImg} alt="head" />
            <div className="baseinfo flex-col text-gray-400 text-xs">
                <p>{loginStatus && userInfo.uname ? userInfo.uname : '未登录'}</p>
                <p>{loginStatus && userInfo.vip ? 
                    <IoDiamondOutline className='text-yellow-500' /> : 
                    <IoDiamondOutline className='text-gray-500' />
                    }
                </p>
            </div>
            {
                loginStatus && userInfo.uname && (
                    <button className='ml-auto flex items-center gap-2 text-gray-400 hover:text-gray-200 cursor-pointer'
                        onClick={async () => {
                            await window.biliApi.logOut();
                            setLoginStatus(false);
                            setMainPageStatus();
                            setUserInfo({ uname: '未登录', head: 'null', vip: false });
                        }}
                    >
                        <FaSignOutAlt />
                    </button>
                )
            }
        </div>
        <hr className='text-green-500' />
            <div className='w-full mt-1 overflow-y-auto custom-scrollbar'>
                <ul className="text-white text-xs flex flex-col gap-2 w-full border border-gray-700 rounded-md p-2">
                    <li className="text-blue-400 text-xs cursor-default">清晰度</li>
                    {videoQualityOptions.map((item) => {
                        if (!userInfo.vip && item.vip) return null;
                        return (
                            <li
                            key={item.qn}
                            className={`flex flex-wrap items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-700 
                                ${selectedQuality === item.qn ? 'bg-gray-600 text-green-500' : ''}
                                ${ !userInfo.vip && item.vip ? 'opacity-50 cursor-not-allowed' : ''}
                            ${ !userInfo.vip && item.vip ? 'bg-gray-100' : ''}`}
                        onClick={() => {
                            if (!userInfo.vip && item.vip) return;
                            selectQuality(item.qn);
                        }}
                        >
                        <input
                            type="checkbox"
                            checked={selectedQuality === item.qn}
                            onChange={() => {
                                if (!userInfo.vip && item.vip) return;
                                selectQuality(item.qn);
                            }}
                        />
                            <span className="inline-flex items-center gap-1 break-words max-w-full">
                            {item.text}
                            {item.vip && <IoDiamondOutline className="text-yellow-500" />}
                            </span>
                        </li>
                        );
                    })}
                </ul>
                <ul className="text-white text-xs flex flex-col gap-2 w-full border border-gray-700 rounded-md p-2">
                    <li className='text-blue-400 text-xs'>默认下载路径:</li>
                    <div className='flex flex-row items-center'>
                        <div className="w-64 rounded-md overflow-hidden text-ellipsis whitespace-nowrap bg-gray-800 text-white p-2">
                            {
                                defaultDownloadPath
                            }
                        </div>
                        <div className='flex flex-row justify-between items-left'>
                            <FaFolder className="inline-block ml-1 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-700"
                             onClick={handleFolderSelect}
                            />
                            <IoCopy className="inline-block ml-1 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-700"
                             onClick={() => {
                                 navigator.clipboard.writeText(defaultDownloadPath);
                             }}
                            />
                        </div>
                    </div>
                </ul>
            </div>
        <hr className='text-green-500' />
        <div className='h-8 flex-row justify-between items-center flex gap-4'>
            <button className='text-green-500 hover:text-green-700 cursor-pointer m-6'
                onClick={async () => {
                    window.electron.setSettings({
                        videoQuality: selectedQuality,
                        downloadPath: defaultDownloadPath
                    });
                    noticeSettingsSaved();
                    onClose();
                }}
            >保存配置</button>
            <button className='text-red-500 hover:text-red-700 cursor-pointer m-6' onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  ); 
};

export default Settings;