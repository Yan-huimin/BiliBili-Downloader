import QRCode from 'react-qr-code';
import headPic from '../assets/bilibiliLoginPicture.png';
import '../css/Modal.css';
import { useBiliQrLogin } from '../hooks/useBiliQrLogin';
import { useClickOutside } from '../hooks/useClickOutside';

interface LoginBiliProps {
  visible: boolean;
  onClose: () => void;
  setLoginstatus: (status: boolean) => void;
  LoginSuccessNotic: (message: string) => void;
}

const LoginBili = ({
  visible,
  onClose,
  setLoginstatus,
  LoginSuccessNotic,
}: LoginBiliProps) => {
  const modalRef = useClickOutside<HTMLDivElement>(visible, onClose);
  const { qrUrl, refreshQrCode, status } = useBiliQrLogin({
    enabled: visible,
    onClose,
    onLoginSuccess: () => {
      setLoginstatus(true);
      LoginSuccessNotic('登录成功');
    },
  });

  if (!visible) {
    return null;
  }

  return (
    <div className="modal-layer">
      <div className="modal-panel login-panel glass-panel" data-testid="loginPanel" ref={modalRef}>
        <div className="login-hero">
          <img alt="Bilibili 登录封面" className="login-hero__image" src={headPic} />
          <div className="qr-shell">
            {qrUrl ? <QRCode value={qrUrl} size={126} /> : <span className="qr-shell__empty">加载中</span>}
          </div>
          <span className="login-status" data-testid="login-status">{status}</span>
        </div>

        <div className="modal-actions">
          <button className="modal-button modal-button--primary" data-testid="login-refresh" onClick={refreshQrCode} type="button">
            刷新
          </button>
          <button className="modal-button modal-button--danger" data-testid="login-cancel" onClick={onClose} type="button">
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginBili;
