/**
 * HMR client script injected into HTML pages.
 * Runs in the browser and handles hot module replacement.
 */
export function getHMRClient(wsProtocol: string): string {
  return `
(function() {
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(wsProto + '//' + location.host);

  socket.onopen = () => console.log('[mini-dev] HMR connected');
  socket.onclose = () => console.log('[mini-dev] HMR disconnected');
  socket.onerror = (e) => console.error('[mini-dev] HMR error', e);

  const hotModuleMap = new Map();

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'update') {
        const { path, timestamp } = data;
        const url = path.startsWith('/') ? path : '/' + path;
        const fullUrl = url.split('?')[0] + '?t=' + timestamp;

        console.log('[mini-dev] HMR update:', path);

        // Re-import the module (browser cache-bust via ?t=)
        try {
          await import(/* @vite-ignore */ fullUrl);
          console.log('[mini-dev] Module updated:', path);
        } catch (err) {
          console.error('[mini-dev] HMR failed for', path, err);
          location.reload();
        }
      }
    } catch (err) {
      console.error('[mini-dev] HMR message error', err);
    }
  };

  // Expose import.meta.hot for modules that opt in
  if (typeof import.meta !== 'undefined' && import.meta) {
    import.meta.hot = {
      accept(_deps, callback) {
        if (callback) hotModuleMap.set(import.meta.url, callback);
      },
      invalidate() {
        location.reload();
      },
      dispose(callback) {
        hotModuleMap.set(import.meta.url + ':dispose', callback);
      }
    };
  }
})();
`.trim();
}
