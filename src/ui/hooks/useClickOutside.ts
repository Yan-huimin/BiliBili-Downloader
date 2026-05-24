import { useEffect, useRef } from 'react';
import { useAppRuntimeStore } from '../stores/useAppRuntimeStore';

export function useClickOutside<T extends HTMLElement>(
  enabled: boolean,
  onOutsideClick: () => void,
) {
  const elementRef = useRef<T>(null);
  const callbackRef = useRef(onOutsideClick);
  const { isBackgroundMode } = useAppRuntimeStore();

  useEffect(() => {
    callbackRef.current = onOutsideClick;
  }, [onOutsideClick]);

  useEffect(() => {
    if (!enabled || isBackgroundMode) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (elementRef.current && !elementRef.current.contains(event.target as Node)) {
        callbackRef.current();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [enabled, isBackgroundMode]);

  return elementRef;
}
