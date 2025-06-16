type EventPayloadMapping = {
    sendFrameAction: FrameWindowAction,
    sendLinkAndDownloadMp4: boolean,
    sendLink: url,
    start_download: any,
    setVideoFolder: string,
    urlPage: url,
    filePath: filePathExist,
}

/*
 *
 ****\test
*/

type __DEVTOOLS_OPENED__ = boolean;


/* ******************************** */


type FrameWindowAction = "CLOSE" | "MINIMIZE" | "MAXIMIZE";
type BvCode = string;
type bvid = string;
type url = string;
type filePathExist = string;
type cid = number;
type header = {
    UserAgent: string,
    Referer: string,
    Cookie: string,
}

interface Window{
    electron: {
        sendFrameAction: (payload: FrameWindowAction) => void;
        sendLinkAndDownloadMp4: (payload: url) => Promise<url>;
        startDownload: (args: { url: string; filePath: string }) => Promise<any>;
        onDownloadProgress: (callback: (progress: number) => void) => void;
        setVideoFolder: () => Promise<string>;
        openPage: (payload: urlPage)  => void;
        checkFileExist: (payload: filePathExist) => filePath;
        on: (channel: string, callback: (...args: any[]) => void) => void;
    }
}