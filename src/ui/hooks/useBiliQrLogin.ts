import { useCallback, useEffect, useRef, useState } from 'react';

type UseBiliQrLoginOptions = {
  onClose: () => void;
  onLoginSuccess: () => void;
};

export function useBiliQrLogin({ onClose, onLoginSuccess }: UseBiliQrLoginOptions) {
  const [qrUrl, setQrUrl] = useState('');
  const [status, setStatus] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCloseRef = useRef(onClose);
  const onLoginSuccessRef = useRef(onLoginSuccess);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
  }, [onLoginSuccess]);

  const clearPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (key: string) => {
    const result = await window.biliApi.pollQRCodeStatus(key);
    console.log(key);

    switch (parseInt(result)) {
      case 86101:
        setStatus('等待扫码...');
        break;
      case 86090:
        setStatus('扫码成功，请确认登录');
        break;
      case 0:
        setStatus('登录成功');
        onLoginSuccessRef.current();
        onCloseRef.current();
        clearPolling();
        break;
      default:
        setStatus('二维码失效，请刷新');
        console.log('key = ', key);
        console.log(result);
        clearPolling();
    }
  }, [clearPolling]);

  const refreshQrCode = useCallback(async () => {
    const data = await window.biliApi.getQr();
    console.log('二维码数据', data, typeof data);

    setQrUrl(data.url);
    setStatus('未登录');
    clearPolling();

    timerRef.current = setInterval(() => {
      void pollStatus(data.qrcode_key);
    }, 2000);
  }, [clearPolling, pollStatus]);

  useEffect(() => {
    void refreshQrCode();

    return () => {
      clearPolling();
    };
  }, [clearPolling, refreshQrCode]);

  return {
    qrUrl,
    refreshQrCode,
    status,
  };
}
