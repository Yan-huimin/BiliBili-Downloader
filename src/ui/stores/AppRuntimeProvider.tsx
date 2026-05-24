import { useState, type ReactNode } from 'react';
import { AppRuntimeContext } from './appRuntimeContext';

export function AppRuntimeProvider({ children }: { children: ReactNode }) {
  const [isBackgroundMode, setBackgroundMode] = useState(false);

  return (
    <AppRuntimeContext.Provider value={{ isBackgroundMode, setBackgroundMode }}>
      {children}
    </AppRuntimeContext.Provider>
  );
}
