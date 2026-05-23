import { createContext, useContext, useState, type ReactNode } from 'react';

interface AppRuntimeState {
  isBackgroundMode: boolean;
  setBackgroundMode: (value: boolean) => void;
}

const AppRuntimeContext = createContext<AppRuntimeState>({
  isBackgroundMode: false,
  setBackgroundMode: () => {},
});

/** Provider：为整个 React 树提供后台模式状态 */
export function AppRuntimeProvider({ children }: { children: ReactNode }) {
  const [isBackgroundMode, setBackgroundMode] = useState(false);

  return (
    <AppRuntimeContext.Provider value={{ isBackgroundMode, setBackgroundMode }}>
      {children}
    </AppRuntimeContext.Provider>
  );
}

/** 读取后台模式状态 */
export function useAppRuntimeStore(): AppRuntimeState {
  return useContext(AppRuntimeContext);
}
