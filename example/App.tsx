import { getEnv } from './env';

interface Env {
  PUBLIC_API_URL?: string;
}

const env = getEnv<Env>();
const apiUrl = env.PUBLIC_API_URL ?? '(not set)';

let count = 0;

export function renderApp(root: HTMLElement): void {
  function update() {
    root.innerHTML = `
      <div class="card">
        <h1>mini-dev Example</h1>
        <p><small>PUBLIC_API_URLs: ${apiUrl}</small></p>
        <p>Edit this file and save — HMR will update without full reload.</p>
        <div>HMR works!</div>
        <button id="count">Count: ${count}</button>
      </div>
    `;
    root.querySelector('#count')?.addEventListener('click', () => {
      count++;
      update();
    });
  }
  update();
}
