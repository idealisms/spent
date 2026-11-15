const input = document.getElementById('url');
const status = document.getElementById('status');

(async () => {
  const { serverUrl } = await chrome.storage.sync.get('serverUrl');
  input.value = serverUrl || '';
})();

document.getElementById('save').addEventListener('click', async () => {
  let url;
  try {
    url = new URL(input.value.trim());
  } catch {
    status.textContent = 'Enter a full URL, e.g. https://raspberrypi.your-tailnet.ts.net:8001';
    return;
  }
  // Ask for access to just this server (needed to post to it).
  const granted = await chrome.permissions.request({ origins: [`${url.origin}/*`] });
  if (!granted) {
    status.textContent = 'Permission to reach the server was denied; not saved.';
    return;
  }
  await chrome.storage.sync.set({ serverUrl: url.origin });
  try {
    const resp = await fetch(new URL('/ping', url.origin));
    status.textContent = resp.ok ? `Saved. Server is reachable.` : `Saved, but /ping returned ${resp.status}.`;
  } catch (e) {
    status.textContent = `Saved, but couldn't reach the server: ${e.message}`;
  }
});
