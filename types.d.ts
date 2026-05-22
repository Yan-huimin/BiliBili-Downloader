type EventPayloadMapping = {
    sendFrameAction: FrameWindowAction,
    sendLinkAndDownloadMp4: boolean,
    sendLink: dashUrl,
    start_download: dashUrl,
    setVideoFolder: string,
    urlPage: url,
    filePath: filePathExist,
    getQr: QRInfo,
    poll_qrcode_status: qrPollCode,
    sendSuccessInfo: downloadSuccess,
    check_login: boolean,
    getUserInfo: UserInfo | null,
    logOut: isLogout,
    setSettings: Settings,
    loadSettings: Settings,
    openDevTools: boolean,
}

/* ******************************** */

type FrameWindowAction = "CLOSE" | "MINIMIZE" | "MAXIMIZE";
type BvCode = string;
type bvid = string;
type url = string;
type filePathExist = string;
type cid = number;
type qrcode_key = string;
type qrPollCode = number;
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
        startDownload: (args: { video_url: string; audio_url: string; filePath: string }) => Promise<unknown>;
        onDownloadProgress: (callback: (progress: number) => void) => void;
        setVideoFolder: () => Promise<string>;
        openPage: (payload: url)  => void;
        checkFileExist: (payload: filePathExist) => Promise<string>;
        on: (channel: string, callback: (payload: string) => void) => void;
        sendSuccessInfo: (payload: downloadSuccess) => void;
        setSettings: (payload: Settings) => void;
        loadSettings: () => Promise<Settings>;
        openDevTools: () => Promise<boolean>;
    },
    biliApi:{
        getQr: () => Promise<QRInfo>;
        pollQRCodeStatus: (payload: qrcode_key) => Promise<qrPollCode>;
        checkLogin: () => Promise<boolean>;
        getUserInfo: () => Promise<UserInfo | null>;
        logOut: () => Promise<isLogout>;
    }
}
