import App from './App.tsx'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setCachedQueue } from './stores/queueStore'
import { loadCachedSettings } from './stores/settingsStore'
import { AppRuntimeProvider } from './stores/AppRuntimeProvider'

const mainElementId = 'root';
const container = document.getElementById(mainElementId);

if (!container) {
  throw new Error(`No container '${mainElementId}' found to render application`);
}

const rootContainer = container;

async function preloadAppData() {
  const preloadTasks: Promise<unknown>[] = [];
  const electronApi = (window as unknown as { electron?: Partial<Window['electron']> }).electron;

  if (electronApi?.loadSettings) {
    preloadTasks.push(loadCachedSettings());
  }

  if (electronApi?.getQueue) {
    preloadTasks.push(
      electronApi.getQueue().then((queue) => {
        setCachedQueue(queue);
      }),
    );
  }

  const results = await Promise.allSettled(preloadTasks);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[main.tsx] App preload failed:', result.reason);
    }
  }
}

function initializeApp() {
  createRoot(rootContainer).render(
    <StrictMode>
      <AppRuntimeProvider>
        <App />
      </AppRuntimeProvider>
    </StrictMode>,
  );
}

async function bootstrap() {
  await preloadAppData();
  initializeApp();
}

bootstrap().catch((error) => {
  console.error('[main.tsx] App bootstrap failed, rendering without preloaded data:', error);
  initializeApp();
});

window.addEventListener('error', (event) => {
  console.error('[main.tsx] Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[main.tsx] Unhandled promise rejection:', event.reason);
});
