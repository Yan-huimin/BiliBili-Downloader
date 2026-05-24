import { createContext } from 'react';

export interface AppRuntimeState {
  isBackgroundMode: boolean;
  setBackgroundMode: (value: boolean) => void;
}

export const AppRuntimeContext = createContext<AppRuntimeState>({
  isBackgroundMode: false,
  setBackgroundMode: () => {},
});
