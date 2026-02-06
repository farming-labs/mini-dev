/**
 * HMR client script injected into HTML pages.
 * Auto-injects HMR: re-imports entry on .ts/.tsx change, swaps CSS links.
 */
export function getHMRClient(_wsProtocol: string, label = 'MINI-DEV'): string {
  const lbl = JSON.stringify(label);
  return `
(function() {
  const label = ${lbl};
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(wsProto + '//' + location.host);

  socket.onopen = () => console.log('[' + label + '] HMR connected');
  socket.onclose = () => console.log('[' + label + '] HMR disconnected');
  socket.onerror = (e) => console.error('[' + label + '] HMR error', e);

  function getEntryUrl() {
    const scripts = document.querySelectorAll('script[type="module"][src]');
    for (const s of scripts) {
      if (s.src && !s.src.includes('@hmr-client')) {
        try { return new URL(s.src).pathname; } catch { return s.src; }
      }
    }
    return null;
  }

  const acceptors = new Map();
  function resolvePath(moduleUrl, dep) {
    try { return new URL(dep, moduleUrl.replace(/[^/]+$/, '') + '/').pathname; } catch { return dep.startsWith('/') ? dep : '/' + dep; }
  }

  window.__MINI_DEV_HOT__ = function(moduleUrl) {
    return {
      accept(deps, callback) {
        if (typeof deps === 'function') { callback = deps; deps = [moduleUrl]; }
        else if (typeof deps === 'string') { deps = [resolvePath(moduleUrl, deps)]; }
        else if (Array.isArray(deps)) { deps = deps.map(d => resolvePath(moduleUrl, d)); }
        else { deps = [moduleUrl]; }
        for (const p of deps) {
          const list = acceptors.get(p) || [];
          list.push({ callback });
          acceptors.set(p, list);
        }
      },
      invalidate() { location.reload(); },
      dispose() {}
    };
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type !== 'update') return;

      const { path, timestamp } = data;
      const url = path.startsWith('/') ? path : '/' + path;
      const fullUrl = url.split('?')[0] + '?t=' + timestamp;

      console.log('[' + label + '] HMR update:', path);

      try {
        if (/\\.css(\\?|$)/.test(url)) {
          const pathPart = url.split('?')[0];
          for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
            if (link.href && link.href.includes(pathPart)) {
              link.href = link.href.replace(/[?&]t=\\d+/, '').replace(/([?&])$/, '') + (link.href.includes('?') ? '&' : '?') + 't=' + timestamp;
            }
          }
          console.log('[' + label + '] CSS updated:', path);
          return;
        }
        const list = acceptors.get(url);
        if (list && list.length > 0) {
          const newModule = await import(/* @vite-ignore */ fullUrl);
          for (const { callback } of list) { callback(newModule); }
          console.log('[' + label + '] Module updated:', path);
        } else {
          const entry = getEntryUrl();
          if (entry) {
            await import(/* @vite-ignore */ entry.split('?')[0] + '?t=' + timestamp);
            console.log('[' + label + '] App refreshed:', entry);
          } else {
            location.reload();
          }
        }
      } catch (err) {
        console.error('[' + label + '] HMR failed for', path, err);
        location.reload();
      }
    } catch (err) {
      console.error('[' + label + '] HMR message error', err);
    }
  };
})();
`.trim();
}
