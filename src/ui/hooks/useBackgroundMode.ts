import { useEffect } from 'react';
import { useAppRuntimeStore } from '../stores/useAppRuntimeStore';

/**
 * 监听主进程发送的后台模式 IPC 事件，
 * 同步 isBackgroundMode 到全局 store。
 */
export function useBackgroundMode() {
  const { setBackgroundMode } = useAppRuntimeStore();

  useEffect(() => {
    const cleanup = window.electron.onBackgroundModeChange((isBackground: boolean) => {
      setBackgroundMode(isBackground);
    });
    return cleanup;
  }, [setBackgroundMode]);
}
