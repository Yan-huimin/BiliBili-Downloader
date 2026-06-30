import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BiCog } from 'react-icons/bi';
import { FaClock } from 'react-icons/fa';
import { LuListVideo } from 'react-icons/lu';
import { MdOutlineVideoLibrary } from 'react-icons/md';
import { RiBilibiliFill } from 'react-icons/ri';
import { RiUserFollowLine } from 'react-icons/ri';
import { MdDarkMode, MdLightMode } from 'react-icons/md';
import { BiCameraMovie } from 'react-icons/bi';
import { TbMathFunction } from 'react-icons/tb';
import { useAppRuntimeStore } from '../stores/useAppRuntimeStore';

type FloatingActionsProps = {
  shareLinkType: ShareLinkType;
  isDarkTheme: boolean;
  loginStatus: boolean;
  open: boolean;
  onOpenCollection: () => void;
  onOpenBangumi: () => void;
  onOpenUserVideo: () => void;
  onOpenLogin: () => void;
  onOpenQueue: () => void;
  onOpenSettings: () => void;
  onShowCurrentTime: () => void;
  onClose: () => void;
  onToggleOpen: () => void;
  onToggleTheme: () => void;
  onAlreadyLoggedIn: () => void;
};

function FloatingActions({
  shareLinkType,
  isDarkTheme,
  loginStatus,
  onAlreadyLoggedIn,
  onClose,
  onOpenBangumi,
  onOpenCollection,
  onOpenUserVideo,
  onOpenLogin,
  onOpenQueue,
  onOpenSettings,
  onShowCurrentTime,
  onToggleOpen,
  onToggleTheme,
  open,
}: FloatingActionsProps) {
  const actionsRef = useRef<HTMLDivElement>(null);
  const { isBackgroundMode } = useAppRuntimeStore();

  useEffect(() => {
    if (!open || isBackgroundMode) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isBackgroundMode, onClose, open]);

  const closeAfterAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="floating-actions" data-testid="changeModeContainer" ref={actionsRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="floating-actions__menu"
            data-testid="floatingMenu"
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            style={{ gridTemplateColumns: 'repeat(3, 38px)' }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {shareLinkType === 'bv' && (
              <button
                aria-label="获取合集"
                className="floating-actions__item"
                data-testid="menu-collection"
                onClick={() => closeAfterAction(onOpenCollection)}
                title="获取合集"
                type="button"
              >
                <MdOutlineVideoLibrary />
              </button>
            )}
            {shareLinkType === 'ep' && (
              <button
                aria-label="获取番剧"
                className="floating-actions__item"
                data-testid="menu-bangumi"
                onClick={() => closeAfterAction(onOpenBangumi)}
                title="获取番剧"
                type="button"
              >
                <BiCameraMovie />
              </button>
            )}
            {shareLinkType === 'space' && (
              <button
                aria-label="获取用户投稿"
                className="floating-actions__item"
                data-testid="menu-uservideo"
                onClick={() => closeAfterAction(onOpenUserVideo)}
                title="获取用户投稿"
                type="button"
              >
                <RiUserFollowLine />
              </button>
            )}
            <button
              aria-label="下载队列"
              className="floating-actions__item"
              data-testid="menu-queue"
              onClick={() => closeAfterAction(onOpenQueue)}
              title="下载队列"
              type="button"
            >
              <LuListVideo />
            </button>
            <button
              aria-label={isDarkTheme ? '切换到明亮主题' : '切换到暗黑主题'}
              className="floating-actions__item"
              data-testid="menu-theme"
              onClick={() => closeAfterAction(onToggleTheme)}
              title={isDarkTheme ? '切换到明亮主题' : '切换到暗黑主题'}
              type="button"
            >
              {isDarkTheme ? <MdLightMode /> : <MdDarkMode />}
            </button>
            <button
              aria-label="显示当前时间"
              className="floating-actions__item"
              data-testid="menu-time"
              onClick={() => closeAfterAction(onShowCurrentTime)}
              title="当前时间"
              type="button"
            >
              <FaClock />
            </button>
            <button
              aria-label={loginStatus ? '已登录' : '登录哔哩哔哩'}
              className="floating-actions__item"
              data-testid="menu-login"
              onClick={() => closeAfterAction(loginStatus ? onAlreadyLoggedIn : onOpenLogin)}
              title={loginStatus ? '已登录' : '登录哔哩哔哩'}
              type="button"
            >
              <RiBilibiliFill />
            </button>
            <button
              aria-label="打开设置"
              className="floating-actions__item"
              data-testid="menu-settings"
              onClick={() => closeAfterAction(onOpenSettings)}
              title="设置"
              type="button"
            >
              <BiCog />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        aria-expanded={open}
        aria-label="快捷功能"
        className="floating-actions__trigger"
        data-testid="changeModeBtn"
        onClick={onToggleOpen}
        title={isDarkTheme ? '切换到明亮主题' : '切换到暗黑主题'}
        type="button"
      >
        <TbMathFunction />
      </button>
    </div>
  );
}

export default FloatingActions;
