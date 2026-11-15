// Runs on Amazon order-details pages: scrapes the order, fetches its
// "related transactions" page for the individual card charges, and hands
// everything to the background worker, which posts it to the fetch-server.
// (Content scripts can't make the cross-origin request themselves.)
//
// Pages that can't be read, or whose charges look unusual, are also sent (as
// a "debug page") so the scraper can be fixed later from the saved HTML.

(function () {
  const { scrapeOrder, scrapeCharges, transactionsUrl } = self.spentScrape;

  // The page renders client-side; retry briefly until the order is there.
  const MAX_ATTEMPTS = 10;
  const RETRY_MS = 500;

  function dollars(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  async function scrapeWhenReady() {
    for (let n = 1; ; n++) {
      const order = scrapeOrder(document, location.href);
      if (!order.error || n >= MAX_ATTEMPTS) return order;
      await new Promise(r => setTimeout(r, RETRY_MS));
    }
  }

  // Returns {charges, html, problem}; problem explains anything worth a look.
  async function fetchCharges(order) {
    let html = null;
    try {
      const resp = await fetch(transactionsUrl(order.order_id), { credentials: 'include' });
      html = await resp.text();
      if (!resp.ok) return { charges: [], html, problem: `transactions page returned ${resp.status}` };
    } catch (e) {
      return { charges: [], html, problem: `couldn't load transactions page: ${e.message}` };
    }
    const charges = scrapeCharges(new DOMParser().parseFromString(html, 'text/html'), order.order_id);
    const sum = charges.reduce((s, c) => s + c.amount_cents, 0);
    let problem = null;
    if (!charges.length) {
      problem = 'no card charges found on transactions page';
    } else if (Math.abs(sum - order.total_cents) > 1) {
      problem = `charges add up to ${dollars(sum)} but the order total is ${dollars(order.total_cents)}`;
    }
    return { charges, html, problem };
  }

  async function main() {
    const order = await scrapeWhenReady();
    if (order.whole_foods) {
      chrome.runtime.sendMessage({ type: 'amazon-order', wholeFoods: true });
      return;
    }
    const orderId = order.order_id || new URLSearchParams(location.search).get('orderID') || location.pathname;
    const debug = {
      page_key: orderId,
      url: location.href,
      order_html: document.documentElement.outerHTML,
    };
    if (order.error) {
      chrome.runtime.sendMessage({ type: 'amazon-order', debug: { ...debug, reason: order.error } });
      return;
    }
    const { charges, html, problem } = await fetchCharges(order);
    order.charges = charges;
    chrome.runtime.sendMessage({
      type: 'amazon-order',
      order,
      debug: problem ? { ...debug, reason: problem, transactions_html: html, scraped: order } : null,
    });
  }

  main();
})();
