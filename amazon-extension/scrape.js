// Extracts an order from an Amazon order-details page.
//
// Relies on the page's data-component attributes (orderDate, orderId,
// chargeSummary, itemTitle, ...), which are much more stable than its
// generated CSS class names. Loaded as a content script before content.js,
// and required by the tests under Node.

(function (root) {
  const MONTHS = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };

  function text(el) {
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function component(doc, name) {
    return doc.querySelector(`[data-component="${name}"]`);
  }

  // "June 25, 2026" -> "2026-06-25"
  function parseDate(s) {
    const m = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(s);
    if (!m || !MONTHS[m[1].toLowerCase()]) return null;
    return `${m[3]}-${MONTHS[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}`;
  }

  // "$1,234.56" -> 123456, "-$0.04" -> -4
  function parseCents(s) {
    const m = /(-?)\$\s*([\d,]+)(?:\.(\d{2}))?/.exec(s);
    if (!m) return null;
    const cents = parseInt(m[2].replace(/,/g, ''), 10) * 100 + parseInt(m[3] || '0', 10);
    return m[1] ? -cents : cents;
  }

  function grandTotalCents(doc) {
    const summary = text(component(doc, 'chargeSummary'));
    const m = /Grand Total:?\s*(-?\$[\d,]+(?:\.\d{2})?)/i.exec(summary);
    return m ? parseCents(m[1]) : null;
  }

  function items(doc) {
    const titles = [];
    for (const el of doc.querySelectorAll('[data-component="itemTitle"]')) {
      const title = text(el);
      if (!title) continue;
      // The quantity badge (on the item image) is empty unless more than one
      // was bought. Several items share one purchasedItems container, so
      // look in the largest ancestor that holds only this item.
      let item = el;
      while (item.parentElement &&
             item.parentElement.querySelectorAll('[data-component="itemTitle"]').length === 1) {
        item = item.parentElement;
      }
      const qty = parseInt(text(item.querySelector('[data-component="quantity"]')), 10);
      titles.push(qty > 1 ? `${qty} x ${title}` : title);
    }
    return titles;
  }

  // In-store Whole Foods purchases show up in Amazon order history (charged
  // by Whole Foods, not Amazon) on a different page template. Only ids from
  // that template are checked: every page's nav bar also says "Whole Foods".
  function isWholeFoodsInStore(doc) {
    if (doc.querySelector('#f3_food_WfmInStoreOrderSummary, #wfm-grand-total-row')) return true;
    return /purchased at whole foods/i.test(text(doc.querySelector('#ufpo-order-status-primary')));
  }

  // Returns {order_id, order_date, total_cents, items, url}, {whole_foods:
  // true} for in-store Whole Foods purchases, or {error} describing what
  // couldn't be found.
  function scrapeOrder(doc, url) {
    if (isWholeFoodsInStore(doc)) return { whole_foods: true };
    const orderId = text(component(doc, 'orderId'));
    const orderDate = parseDate(text(component(doc, 'orderDate')));
    const totalCents = grandTotalCents(doc);
    const titles = items(doc);
    const missing = [
      !orderId && 'order id',
      !orderDate && 'order date',
      totalCents === null && 'grand total',
      !titles.length && 'items',
    ].filter(Boolean);
    if (missing.length) return { error: `Couldn't find ${missing.join(', ')} on the page` };
    return {
      order_id: orderId,
      order_date: orderDate,
      total_cents: totalCents,
      items: titles,
      url,
    };
  }

  // The "View related transactions" page for an order.
  function transactionsUrl(orderId) {
    return `https://www.amazon.com/cpe/yourpayments/transactions?transactionTag=${encodeURIComponent(orderId)}`;
  }

  // Card charges for orderId from the transactions page:
  // [{date, amount_cents, payment}], amount positive for a charge. Refunds and
  // gift card payments (which never reach a card statement) are skipped.
  // Rows are a date header followed by that day's line items.
  function scrapeCharges(doc, orderId) {
    const charges = [];
    let date = null;
    const rows = doc.querySelectorAll(
      '.apx-transaction-date-container, .apx-transactions-line-item-component-container');
    for (const row of rows) {
      if (row.classList.contains('apx-transaction-date-container')) {
        date = parseDate(text(row));
        continue;
      }
      const rowText = text(row);
      if (!rowText.includes(orderId)) continue;
      const amountEl = [...row.querySelectorAll('span')].find(el => /^-?\$[\d,.]+$/.test(text(el)));
      const amount = amountEl ? parseCents(text(amountEl)) : null;
      const payment = text(row.querySelector('.a-text-bold'));
      if (!date || amount === null || amount >= 0 || /gift card/i.test(payment)) continue;
      charges.push({ date, amount_cents: -amount, payment });
    }
    return charges;
  }

  const api = { scrapeOrder, scrapeCharges, transactionsUrl, parseDate, parseCents };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.spentScrape = api;
  }
})(typeof self !== 'undefined' ? self : this);
