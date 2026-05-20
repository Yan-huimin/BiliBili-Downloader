import { ipcMain, WebFrameMain } from "electron";
import { isValidElement } from "react";
import { isDev } from "./utils.js";
import { pathToFileURL } from 'url';
import { getUiPath } from "./pathResolver.js";

/**
 * 类型安全的 IPC 单向事件监听封装（渲染进程 → 主进程）。
 * 自动校验发送方来源（开发模式或合法文件路径），防止恶意事件注入。
 * @param key - IPC 通道名称，由 EventPayloadMapping 类型约束。
 * @param handler - 收到事件时执行的回调函数，接收类型匹配的 payload。
 */
export function IpcMainOn<Key extends keyof EventPayloadMapping>(
    key: Key,
    handler: (payload: EventPayloadMapping[Key]) => void
) {
    ipcMain.on(key, (event, payload) => {
        if(event.senderFrame){
            isValidElement(event.senderFrame);
        }
        return handler(payload)
    });
}

/**
 * 类型安全的 IPC invoke/handle 双向通信封装（渲染进程 → 主进程 → 返回值）。
 * 自动校验发送方来源，防止恶意事件注入。
 * @param key - IPC 通道名称，由 EventPayloadMapping 类型约束。
 * @param handler - 处理请求的异步回调函数，接收 payload 并返回同类型的 Promise。
 */
export function IpcMainHandle<Key extends keyof EventPayloadMapping>(
    key: Key,
    handler: (payload: EventPayloadMapping[Key]) => Promise<EventPayloadMapping[Key]>
) {
    ipcMain.handle(key, async (event, payload) => {
        if(event.senderFrame){
            isValidElement(event.senderFrame);
        }
        return await handler(payload);
    });
}

/**
 * 类型安全的 IPC 事件取消监听封装。
 * @param key - IPC 通道名称，由 EventPayloadMapping 类型约束。
 * @param handler - 要移除的回调函数。
 */
export function IpcMainOff<Key extends keyof EventPayloadMapping>(
    key: Key,
    handler: () => void
){
    ipcMain.off(key, (event) => {
        if(event.senderFrame){
            validdataEventFrame(event.senderFrame);
        }
        return handler();
    })
}

/**
 * 校验 IPC 事件的发送方来源是否合法。
 * 开发模式下允许来自 localhost:5123 的事件，生产模式下只允许来自本应用 UI 文件的事件。
 * @param frame - 发送方 WebFrameMain 实例。
 * @throws 如果来源不合法，抛出 'Malicious event' 错误。
 */
function validdataEventFrame(frame: WebFrameMain){
    if(isDev() && new URL(frame.url).host === 'localhost:5123'){
        return;
    }
    if(frame.url !== pathToFileURL(getUiPath()).toString()){
        throw new Error('Malicious event');
    }
}