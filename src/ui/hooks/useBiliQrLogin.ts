import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppRuntimeStore } from '../stores/useAppRuntimeStore';
import { invalidateCachedUserInfo } from '../stores/settingsStore';

const QR_POLL_INTERVAL_MS = 2000;

const QR_LOGIN_CODE = {
  SUCCESS: 0,
  EXPIRED: 86038,
  CONFIRMED: 86090,
  WAITING: 86101,
} as const;

const QR_STATUS_TEXT = {
  idle: '未登录',
  loading: '二维码加载中',
  waiting: '等待扫码...',
  confirmed: '扫码成功，请在手机上确认',
  success: '登录成功',
  expired: '二维码已失效，请刷新',
  error: '登录状态异常，请刷新重试',
} as const;

type UseBiliQrLoginOptions = {
  enabled: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
};

export function useBiliQrLogin({
  enabled,
  onClose,
  onLoginSuccess,
}: UseBiliQrLoginOptions) {
  const [qrUrl, setQrUrl] = useState('');
  const [status, setStatus] = useState<string>(QR_STATUS_TEXT.idle);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCloseRef = useRef(onClose);
  const onLoginSuccessRef = useRef(onLoginSuccess);
  const { isBackgroundMode } = useAppRuntimeStore();

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

  const handlePollCode = useCallback((code: number) => {
    switch (code) {
      case QR_LOGIN_CODE.WAITING:
        setStatus(QR_STATUS_TEXT.waiting);
        break;
      case QR_LOGIN_CODE.CONFIRMED:
        setStatus(QR_STATUS_TEXT.confirmed);
        break;
      case QR_LOGIN_CODE.SUCCESS:
        setStatus(QR_STATUS_TEXT.success);
        clearPolling();
        invalidateCachedUserInfo();
        onLoginSuccessRef.current();
        onCloseRef.current();
        break;
      case QR_LOGIN_CODE.EXPIRED:
        setStatus(QR_STATUS_TEXT.expired);
        clearPolling();
        break;
      default:
        setStatus(QR_STATUS_TEXT.error);
        clearPolling();
    }
  }, [clearPolling]);

  const pollStatus = useCallback(async (key: string) => {
    try {
      const code = await window.biliApi.pollQRCodeStatus(key);
      handlePollCode(code);
    } catch (error) {
      console.error('[useBiliQrLogin] poll failed:', error);
      setStatus(QR_STATUS_TEXT.error);
      clearPolling();
    }
  }, [clearPolling, handlePollCode]);

  const refreshQrCode = useCallback(async () => {
    clearPolling();
    setQrUrl('');
    setStatus(QR_STATUS_TEXT.loading);

    try {
      const data = await window.biliApi.getQr();

      if (!data?.url || !data.qrcode_key) {
        throw new Error('Invalid QR code response');
      }

      setQrUrl(data.url);
      setStatus(QR_STATUS_TEXT.waiting);
      timerRef.current = setInterval(() => {
        void pollStatus(data.qrcode_key);
      }, QR_POLL_INTERVAL_MS);
    } catch (error) {
      console.error('[useBiliQrLogin] refresh failed:', error);
      setStatus(QR_STATUS_TEXT.error);
    }
  }, [clearPolling, pollStatus]);

  useEffect(() => {
    if (!enabled || isBackgroundMode) {
      clearPolling();
      setQrUrl('');
      setStatus(QR_STATUS_TEXT.idle);
      return;
    }

    void refreshQrCode();

    return () => {
      clearPolling();
    };
  }, [clearPolling, enabled, isBackgroundMode, refreshQrCode]);

  return {
    qrUrl,
    refreshQrCode,
    status,
  };
}
