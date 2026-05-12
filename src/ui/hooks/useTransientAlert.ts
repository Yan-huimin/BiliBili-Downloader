import { useCallback, useEffect, useRef, useState } from 'react';

export function useTransientAlert(duration = 3000) {
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlertMessage = useCallback((message: string) => {
    setAlertMessage(message);
    setShowAlert(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setShowAlert(false);
    }, duration);
  }, [duration]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    alertMessage,
    showAlert,
    showAlertMessage,
  };
}
