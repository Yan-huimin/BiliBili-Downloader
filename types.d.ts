type EventPayloadMapping = {
    sendFrameAction: FrameWindowAction,
    sendLinkAndDownloadMp4: boolean,
    sendLink: url,
    start_download: any,
    setVideoFolder: string,
    urlPage: url,
    filePath: filePathExist,
    getQr: QRInfo,
    poll_qrcode_status: qrcode_key,
    sendSuccessInfo: downloadSuccess,
    check_login: boolean,
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
type qrcode_key = string;
type header = {
    UserAgent: string,
    Referer: string,
    Cookie: string,
};
type QRInfo = {
    url: string,
    qrcode_key: string,
};
type UserInfo = {
  id: string;
  nickname: string;
  avatar?: string;
  membership: 'SVIP' | 'Diamond' | 'VIP' | 'Regular';
  verified: boolean;
  status: string;
};
type downloadSuccess = {
    types: string,
    message: string
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
        sendSuccessInfo: (payload: downloadSuccess) => void;
    },
    biliApi:{
        getQr: () => Promise<QRInfo>;
        pollQRCodeStatus: (payload: qrcode_key) => Promise<qrcode_key>;
        checkLogin: () => Promise<boolean>;
    }
}