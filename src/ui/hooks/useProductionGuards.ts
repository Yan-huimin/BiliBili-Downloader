import { useEffect } from 'react';

export function useProductionGuards() {
  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }

    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    const preventDevToolsShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey && event.shiftKey && event.key === 'I') || event.key === 'F12') {
        event.preventDefault();
      }
    };

    window.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('keydown', preventDevToolsShortcut);

    return () => {
      window.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('keydown', preventDevToolsShortcut);
    };
  }, []);
}
