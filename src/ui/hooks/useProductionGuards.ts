import { useEffect } from 'react';
import { useAppRuntimeStore } from '../stores/useAppRuntimeStore';

export function useProductionGuards() {
  const { isBackgroundMode } = useAppRuntimeStore();

  useEffect(() => {
    if (isBackgroundMode) {
      return;
    }

    const preventContextMenu = (event: MouseEvent) => event.preventDefault();

    const preventDevToolsShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey && event.shiftKey && event.key === 'I') || event.key === 'F12') {
        event.preventDefault();
      }
    };

    const preventDoubleClickFullscreen = (event: MouseEvent) => {
      if (event.detail >= 2) {
        event.preventDefault();
      }
    };

    window.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('keydown', preventDevToolsShortcut);
    window.addEventListener('dblclick', preventDoubleClickFullscreen);

    return () => {
      window.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('keydown', preventDevToolsShortcut);
      window.removeEventListener('dblclick', preventDoubleClickFullscreen);
    };
  }, [isBackgroundMode]);
}
