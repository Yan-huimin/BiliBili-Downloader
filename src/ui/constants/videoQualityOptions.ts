export type VideoQualityOption = {
  label: string;
  qn: number;
  text: string;
  vip: boolean;
};

export const VIDEO_QUALITY_OPTIONS: VideoQualityOption[] = [
  { label: '360p', qn: 6, text: '360p', vip: false },
  { label: '480p', qn: 32, text: '480p', vip: false },
  { label: '720pgq', qn: 64, text: '720p高清', vip: false },
  { label: '720pgzl', qn: 74, text: '720p高帧率', vip: false },
  { label: '1080p', qn: 80, text: '1080p高清', vip: true },
  { label: '1080pgml', qn: 112, text: '1080p高码率', vip: true },
  { label: '1080p60gzl', qn: 116, text: '1080p60高帧率', vip: true },
  { label: '4k', qn: 120, text: '4k', vip: true },
];
