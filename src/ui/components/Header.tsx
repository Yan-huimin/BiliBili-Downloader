import { useEffect, useRef } from 'react';
import '../css/Header.css';

const Header = ({ isActive }: { isActive: boolean }) => {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const preventDoubleClickMaximize = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    el.addEventListener('dblclick', preventDoubleClickMaximize, { capture: true });
    return () => {
      el.removeEventListener('dblclick', preventDoubleClickMaximize, { capture: true });
    };
  }, []);

  return (
    <header className="app-titlebar" data-testid="head" ref={headerRef}>
      <div className="traffic-lights" aria-label="窗口控制">
        <button
          aria-label="close"
          id="close"
          onClick={() => window.electron.sendFrameAction('CLOSE')}
          type="button"
        />
        <button
          aria-label="minimize"
          id="minimize"
          onClick={() => window.electron.sendFrameAction('MINIMIZE')}
          type="button"
        />
        <button
          aria-label="maximize"
          id="maximize"
          onClick={() => window.electron.sendFrameAction('MAXIMIZE')}
          type="button"
        />
      </div>

      <div className="titlebar-status" aria-label={isActive ? '已登录' : '未登录'}>
        <span
          className="titlebar-status__light"
          id="breathlight"
          style={{ visibility: isActive ? 'visible' : 'hidden' }}
        />
      </div>
    </header>
  );
};

export default Header;
