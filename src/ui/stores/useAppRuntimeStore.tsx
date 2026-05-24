import { useContext } from 'react';
import { AppRuntimeContext, type AppRuntimeState } from './appRuntimeContext';

/** 读取后台模式状态 */
export function useAppRuntimeStore(): AppRuntimeState {
  return useContext(AppRuntimeContext);
}
