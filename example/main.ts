import { renderApp } from './App.tsx';
import { getEnv } from './env.ts';

const app = document.getElementById('app');
console.log('getEnv', getEnv());
if (app) renderApp(app);
