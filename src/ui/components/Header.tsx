import '../css/Header.css';

const Header = () => {
    return(
        <>
            <header className="z-999" data-testid="head">
                <button 
                id="close"
                aria-label="close"
                onClick={() => window.electron.sendFrameAction("CLOSE")}
                />
                <button 
                id="minimize"
                aria-label='minimize'
                onClick={() => window.electron.sendFrameAction("MINIMIZE")}
                />
                <button 
                id="maximize"
                aria-label='maximize'
                onClick={() => window.electron.sendFrameAction("MAXIMIZE")}
                />
            </header>
        </>
    )
}

export default Header;