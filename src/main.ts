import './style.css';
import { App } from './app.ts';
import { loadAnalytics } from './analytics.ts';
import { watchForTouch } from './ui/device.ts';
import { byId } from './ui/dom.ts';

declare global {
  interface Window {
    /** Present in dev builds only, so tests can watch the game. */
    taxiRush?: App;
  }
}

watchForTouch(document.documentElement);
const app = new App(byId<HTMLCanvasElement>('view'));
if (import.meta.env.DEV) window.taxiRush = app;
loadAnalytics();
