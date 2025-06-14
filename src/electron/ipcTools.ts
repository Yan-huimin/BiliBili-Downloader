import { ipcMain, WebFrameMain } from "electron";
import { isValidElement } from "react";
import { isDev } from "./utils.js";
import { pathToFileURL } from 'url';
import { getUiPath } from "./pathResolver.js";

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

function validdataEventFrame(frame: WebFrameMain){
    if(isDev() && new URL(frame.url).host === 'localhost:5123'){
        return;
    }
    if(frame.url !== pathToFileURL(getUiPath()).toString()){
        throw new Error('Malicious event');
    }
}