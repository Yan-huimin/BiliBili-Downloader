import React, { useState, useRef, useEffect } from 'react';
import '../css/Settings.css';
import headPic from "../assets/bilibiliLoginPicture.png";
import QRCode from 'react-qr-code';

interface MyModalProps {
  visible: boolean;
  onClose: () => void;
  setLoginstatus: (status: boolean) => void;
  LoginSuccessNotic: (message: string) => void;
}

const LoginBili: React.FC<MyModalProps> = ({ visible, onClose, setLoginstatus, LoginSuccessNotic }) => {
  //@ts-ignore
  const [position, setPosition] = useState({ left: 80, top: 130 }); // 初始位置
  const modalRef = useRef<HTMLDivElement>(null);
  const [QRUrl, setQRUrl] = useState("");
  //@ts-ignore
  const [QRCodeKey, setQRCodeKey] = useState("");
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState("");
  const [loginStatus, setLoginStatus] = useState(false);

  const fetchQRCode = async () => {
    const data = await window.biliApi.getQr();
    console.log("二维码数据", data, typeof(data));
    setQRUrl(data.url);
    setQRCodeKey(data.qrcode_key);

    setStatus("未登录");

    if(timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      pollStatus(data.qrcode_key)
    }, 2000);
  }

  const pollStatus = async (key: string) => {
    const res = await window.biliApi.pollQRCodeStatus(key);
    console.log(key);
    const cur = parseInt(res);
    switch (cur) {
      case 86101:
        setStatus('等待扫码...');
        break;
      case 86090:
        setStatus('扫码成功，请确认登录');
        break;
      case 0:
        setStatus('登录成功');
        setLoginStatus(true);
        setLoginstatus(true);
        onClose();
        LoginSuccessNotic('登录成功');
        clearInterval(timerRef.current ?? undefined);
        break;
      default:
        setStatus('二维码失效，请刷新');
        console.log("key = ",key);
        console.log(res);
        clearInterval(timerRef.current ?? undefined);
    }
  }

  useEffect(() => {
    fetchQRCode();

    return () => {
      if(timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose(); // 如果点击的是组件外部，关闭模态框
    }
  };

  if (visible) {
    document.addEventListener('mousedown', handleClickOutside);
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
      className="fixed bg-black/60 rounded-lg p-4 flex flex-col
      z-50 rounded-lg gap-4
      "
      style={{ left: position.left, top: position.top }}
    >
      <div className='w-50 h-50 flex flex-col justify-center items-center'>
        <span className=''>
          <img src={headPic} alt="封面" className='w-full h-full' />
        </span>
        <hr className='text-blue-500' />
        <span className='w-30 h-30 flex flex-col justify-center items-center m-2'>
          {QRUrl && <QRCode value={QRUrl} size={130} />}
        </span>
        {/* 登录状态 */}
        <span className='text-blue-500 text-xs m-1'>
          {status}
        </span>
      </div>
      <hr className='text-green-500' />
      <div className="flex flex-row gap-2 justify-between items-center">
        <button
          onClick={async () => {
            fetchQRCode();
          }}
        >
          <span className="text-blue-500 p-2 hover:text-blue-800 cursor-pointer">刷新</span>
        </button>
        <button
          onClick={() => {
            onClose();
          }}
        >
          <span className="text-red-500 p-2 hover:text-red-800 cursor-pointer">取消</span>
        </button>
      </div>
    </div>
  ); 
};

export default LoginBili;
