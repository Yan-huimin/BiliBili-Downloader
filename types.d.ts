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
    fetchCollection: string,
    fetchBangumiEpisodes: number,
    enqueueBulk: DownloadTask[],
    enqueueSingle: DownloadTask,
    cancelDownload: number,
    clearQueue: boolean,
    getQueue: DownloadTask[],
    dequeue: DownloadTask[],
    removeTask: number,
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

/* 合集 */
type CollectionVideo = {
  bvid: string;
  title: string;
  duration: number;
  author: string;
};

type CollectionInfo = {
  title: string;
  videos: CollectionVideo[];
};

/* 分享链接类型 */
type ShareLinkType = 'bv' | 'ep' | 'both' | 'none';

/* 统一视频列表项 */
type VideoListItem = {
  key: string;
  title: string;
  duration: number;
  selectable: boolean;
  subtitle?: string;
  statusBadge?: {
    text: string;
    bgColor: string;
  };
};

/* 下载队列 */
type DownloadTaskStatus = 'waiting' | 'downloading' | 'completed' | 'cancelled' | 'error';

type DownloadTask = {
  id: number;
  bvid: string;
  title: string;
  duration: number;
  progress: number;
  status: DownloadTaskStatus;
  errorMessage?: string;
  filePath?: string;
  retryCount?: number;
};

/* 番剧 */
type BangumiEpisodeStatus = 'free' | 'limited_free' | 'vip' | 'preview' | 'restricted';

type BangumiEpisode = {
  ep_id: number;
  bvid: string;
  title: string;
  show_title: string;
  duration: number;
  badge: string;
  badge_type: number;
  status: number;
  episodeStatus: BangumiEpisodeStatus;
};

type BangumiInfo = {
  season_id: number;
  title: string;
  isVip: boolean;
  episodes: BangumiEpisode[];
};

interface Window{
    electron: {
        sendFrameAction: (payload: FrameWindowAction) => void;
        sendLinkAndDownloadMp4: (payload: dashUrl) => Promise<dashUrl>;
        startDownload: (args: { video_url: string; audio_url: string; filePath: string }) => Promise<unknown>;
        onDownloadProgress: (callback: (progress: number) => void) => () => void;
        setVideoFolder: () => Promise<string>;
        openPage: (payload: url)  => void;
        checkFileExist: (payload: filePathExist) => Promise<string>;
        on: (channel: 'download-complete' | 'download-error', callback: (payload: string) => void) => () => void;
        sendSuccessInfo: (payload: downloadSuccess) => void;
        setSettings: (payload: Settings) => void;
        loadSettings: () => Promise<Settings>;
        openDevTools: () => Promise<boolean>;
        fetchCollection: (bvid: string) => Promise<CollectionInfo | null>;
        fetchBangumiEpisodes: (epId: number) => Promise<BangumiInfo | null>;
        enqueueBulk: (tasks: DownloadTask[]) => void;
        enqueueSingle: (task: DownloadTask) => void;
        cancelDownload: (taskId: number) => void;
        clearQueue: () => void;
        getQueue: () => Promise<DownloadTask[]>;
        onQueueUpdated: (callback: (queue: DownloadTask[]) => void) => () => void;
        removeTask: (taskId: number) => void;
        onBackgroundModeChange: (callback: (isBackgroundMode: boolean) => void) => () => void;
    },
    biliApi:{
        getQr: () => Promise<QRInfo>;
        pollQRCodeStatus: (payload: qrcode_key) => Promise<qrPollCode>;
        checkLogin: () => Promise<boolean>;
        getUserInfo: () => Promise<UserInfo | null>;
        logOut: () => Promise<isLogout>;
    }
}
