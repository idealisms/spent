# amazon-extension

Chrome extension (Manifest V3) that sends Amazon orders to the fetch-server so
they can be matched to card transactions and given a readable description.

When you open an order's details page on amazon.com, the extension reads the
order date, order number, grand total and item titles, fetches the order's
"related transactions" page for the individual card charges (an order that
ships in parts is charged per shipment), and POSTs it all to
`<fetch-server>/amazon/orders`. The fetch-server stores the order and, on each
run, matches it to an Amazon card transaction in `transactions.json` and writes
a short Claude-written summary of the items into that transaction's `notes`.
Charges often post a few days after the order (when items ship); unmatched
orders are retried on every run.

In-store Whole Foods purchases also appear in Amazon order history, on a
different page template. The extension recognizes that template and skips
them. (Whole Foods *deliveries* ordered on Amazon are regular orders.)

Pages the extension can't read, or whose charges look unusual (none found,
not adding up to the order total, or split into several charges), are sent to
`<fetch-server>/amazon/debug` along with their HTML, so the scraper can be
fixed from real pages later. They're listed in the fetch-server's web UI.

## Install

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
   select this directory.
2. Click the extension's icon (or open its options) and enter the
   fetch-server URL. With Tailscale, use its Tailscale name, e.g.
   `https://raspberrypi.your-tailnet.ts.net:8001` (the certificate is for
   that name, so `https://pi.home:8001` fails). Without Tailscale, on the
   home network, use the plain-HTTP LAN port if the server enables it
   (`lan_http_port`), e.g. `http://pi.home:8002`. Chrome asks for permission
   to reach that server, and saving checks that it responds.
3. Open any order's details page (**Returns & Orders** → **View order
   details**). The icon's badge shows the result:

| Badge | Meaning |
|-------|---------|
| ✓ (green) | Sent (or already matched) |
| WF (grey) | Whole Foods in-store purchase, skipped |
| ! (red) | Error; hover the icon for details |

Hovering the icon also says when the page was saved for debugging.
| ? (yellow) | Server URL not set |

The fetch-server's web UI lists received orders and whether they've matched.

## Files

| File | Purpose |
|------|---------|
| `scrape.js` | Pure `scrapeOrder(document, url)` and `scrapeCharges(document, orderId)` |
| `content.js` | Runs on order-details pages; scrapes, fetches charges, decides what to send for debugging |
| `background.js` | Posts to the fetch-server, sets the badge |
| `options.html`, `options.js` | Server URL setting |

## Tests

```bash
npm install
npm test
```

`test/fixtures.js` holds hand-written stand-ins for the order-details,
Whole Foods and transactions pages that mirror the real markup without
personal details. If Amazon changes its pages and scraping breaks, get the
HTML from the fetch-server's debug pages (or save the page with Ctrl+S,
"Webpage, HTML only"), compare its structure with the fixtures, and update
both. Don't commit
saved pages: they contain your name, address and card digits.
