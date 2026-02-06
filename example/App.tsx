let count = 0;

export function renderApp(root: HTMLElement): void {
  function update() {
    root.innerHTML = `
      <div class="card">
        <h1>mini-dev Example</h1>
        <p>Edit this file and save — HMR will update without full reload.</p>
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
