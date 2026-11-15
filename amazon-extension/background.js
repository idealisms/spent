// Posts scraped orders (and pages that couldn't be scraped) to the
// fetch-server, and shows the outcome as a badge on the extension icon.

const BADGES = {
  pending: { text: '✓', color: '#1a7f37', title: 'Sent: will be matched to a card transaction once it posts' },
  matched: { text: '✓', color: '#1a7f37', title: 'Already matched to a card transaction' },
  wholeFoods: { text: 'WF', color: '#777777', title: 'Whole Foods in-store purchase: ignored' },
  error: { text: '!', color: '#cf222e', title: 'Error' },
  setup: { text: '?', color: '#bf8700', title: 'Set the fetch-server URL in the extension options' },
};

async function setBadge(tabId, kind, detail) {
  const b = BADGES[kind];
  try {
    await chrome.action.setBadgeText({ tabId, text: b.text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: b.color });
    await chrome.action.setTitle({ tabId, title: detail ? `${b.title}: ${detail}` : b.title });
  } catch (e) {
    // The tab was closed (or navigated away) before the post finished.
    console.debug(`Couldn't set badge on tab ${tabId}: ${e.message}`);
  }
}

async function post(serverUrl, path, body) {
  try {
    const resp = await fetch(new URL(path, serverUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return { error: `server returned ${resp.status}` };
    return await resp.json();
  } catch (e) {
    return { error: `couldn't reach ${serverUrl} (${e.message})` };
  }
}

async function handle({ order, debug, wholeFoods }) {
  if (wholeFoods) return { kind: 'wholeFoods' };
  const { serverUrl } = await chrome.storage.sync.get('serverUrl');
  if (!serverUrl) return { kind: 'setup' };

  let debugNote = '';
  if (debug) {
    const r = await post(serverUrl, '/amazon/debug', debug);
    debugNote = r.error
      ? `couldn't save page for debugging: ${r.error}`
      : `page saved to fetch-server for debugging: ${debug.reason}`;
  }
  if (!order) return { kind: 'error', detail: `couldn't read this order; ${debugNote}` };

  const r = await post(serverUrl, '/amazon/orders', order);
  if (r.error) return { kind: 'error', detail: debugNote ? `${r.error}; ${debugNote}` : r.error };
  if (!BADGES[r.status]) return { kind: 'error', detail: `unexpected status ${r.status}` };
  return { kind: r.status, detail: debugNote };
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== 'amazon-order' || !sender.tab) return;
  (async () => {
    const { kind, detail } = await handle(msg);
    await setBadge(sender.tab.id, kind, detail);
  })();
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
