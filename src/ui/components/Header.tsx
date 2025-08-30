import '../css/Header.css';

const Header = ({ isActive }: { isActive: boolean }) => {
    return(
        <>
            <header className="z-999 flex flex-row justify-between align-items:center" data-testid="head">
                <div>
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
                </div>

                <div className='flex flex-col justify-center items-center mr-2'>
                    <span
                        className='rounded-full w-3 h-3'
                        id='breathlight'
                        style={{ visibility: isActive ? 'visible' : 'hidden' }}
                    />
                </div>


            </header>
        </>
    )
}

export default Header;