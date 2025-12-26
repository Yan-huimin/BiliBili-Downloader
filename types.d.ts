type EventPayloadMapping = {
    sendFrameAction: FrameWindowAction,
    sendLinkAndDownloadMp4: boolean,
    sendLink: dashUrl,
    start_download: dashUrl,
    setVideoFolder: string,
    urlPage: url,
    filePath: filePathExist,
    getQr: QRInfo,
    poll_qrcode_status: qrcode_key,
    sendSuccessInfo: downloadSuccess,
    check_login: boolean,
    getUserInfo: UserInfo,
    logOut: isLogout,
    setSettings: Settings,
    loadSettings: Settings,
}


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
  uname: string;
  face: string;
  vipStatus: number;
  isLogin: boolean;
};
type downloadSuccess = {
    types: string,
    message: string
}
type Settings = {
    videoQuality: number | null;
    downloadPath: string;
    systemNotification: boolean;
    fireworkParticles: boolean;
}
type dashUrl = {
    video_url: string;
    audio_url: string;
}
type isLogout = boolean;

interface Window{
    electron: {
        sendFrameAction: (payload: FrameWindowAction) => void;
        sendLinkAndDownloadMp4: (payload: dashUrl) => Promise<dashUrl>;
        startDownload: (args: { video_url: string; audio_url: string; filePath: string }) => Promise<any>;
        onDownloadProgress: (callback: (progress: number) => void) => void;
        setVideoFolder: () => Promise<string>;
        openPage: (payload: urlPage)  => void;
        checkFileExist: (payload: filePathExist) => filePath;
        on: (channel: string, callback: (...args: any[]) => void) => void;
        sendSuccessInfo: (payload: downloadSuccess) => void;
        setSettings: (payload: Settings) => void;
        loadSettings: () => Promise<Settings>;
    },
    biliApi:{
        getQr: () => Promise<QRInfo>;
        pollQRCodeStatus: (payload: qrcode_key) => Promise<qrcode_key>;
        checkLogin: () => Promise<boolean>;
        getUserInfo: () => Promise<UserInfo>;
        logOut: () => Promise<isLogout>;
    }
}