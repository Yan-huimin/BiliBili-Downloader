import '../css/Header.css';

const Header = ({ isActive }: { isActive: boolean }) => {
  return (
    <header className="app-titlebar" data-testid="head">
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
        {/* <span className="titlebar-status__text">{isActive ? '已登录' : '未登录'}</span> */}
      </div>
    </header>
  );
};

export default Header;
