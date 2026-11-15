// Minimal stand-ins for Amazon order-details pages, mirroring the
// data-component structure of real saved pages (Nov 2026) without any
// personal details. The real pages also link to "Whole Foods Market" in the
// nav bar, which must not mark an order as a Whole Foods purchase.

function item({ title, qty = '', seller = 'Amazon.com', price }) {
  return `
    <div class="row">
      <div data-component="purchasedItemsLeftGrid">
        <div data-component="itemImage"><img alt=""></div>
        <div data-component="quantity">${qty}</div>
      </div>
      <div data-component="purchasedItemsRightGrid">
        <div data-component="itemTitle"><a href="/dp/B000000000">${title}</a></div>
        <div data-component="orderedMerchant">Sold by: ${seller}</div>
        <div data-component="unitPrice"><span>${price}</span><span aria-hidden="true">${price}</span></div>
      </div>
    </div>`;
}

function page({ date, orderId, summary, items, title = 'Order Details' }) {
  return `<!doctype html><html><head><title>Order Details</title></head><body>
    <header><nav>
      <a href="/alm/storefront?almBrandId=wholefoods">Whole Foods Market</a>
      <a href="/whole-foods">Whole Foods</a>
    </nav></header>
    <div data-component="default">
      <div data-component="orderDetailsTitle"><h1>${title}</h1></div>
      <div data-component="briefOrderInfoInvoice">
        <span data-component="orderDateLabel">Order placed</span>
        <span data-component="orderDate">${date}</span>
        <span data-component="orderIdLabel">Order #</span>
        <span data-component="orderId">${orderId}</span>
      </div>
      <div data-component="orderSummary">
        <div data-component="shippingAddress">Ship to Jane Doe</div>
        <div data-component="chargeSummary">
          <h2>Order Summary</h2>
          ${summary.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('')}
        </div>
      </div>
      <div data-component="orderCard">
        <div data-component="shipments">
          <div data-component="shipmentsLeftGrid">
            <div data-component="shipmentStatus"></div>
            <div data-component="purchasedItems">${items.map(item).join('')}</div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

module.exports.singleItem = page({
  date: 'November 10, 2026',
  orderId: '112-0000000-0000001',
  summary: [
    ['Item(s) Subtotal:', '$9.49'],
    ['Shipping &amp; Handling:', '$0.00'],
    ['Subscribe &amp; Save:', '-$1.42'],
    ['Total before tax:', '$8.07'],
    ['Estimated tax to be collected:', '$0.70'],
    ['Grand Total:', '$8.77'],
  ],
  items: [{ title: "MRS. MEYER'S CLEAN DAY Liquid Hand Soap Refill, Honeysuckle, 33 Oz", price: '$9.49' }],
});

module.exports.twoItems = page({
  date: 'June 5, 2026',
  orderId: '114-0000000-0000002',
  summary: [
    ['Item(s) Subtotal:', '$1,078.98'],
    ['Promotional credit:', '-$0.04'],
    ['Grand Total:', '$1,085.75'],
  ],
  items: [
    { title: 'PlanetBox Rover Stainless Steel Bento Box', qty: '2', price: '$43.99' },
    { title: 'PlanetBox Shuttle Stainless Shuttle Bento Box', price: '$34.99' },
  ],
});

// Groceries delivered by Amazon from Whole Foods use the normal template and
// are charged by Amazon, so they're regular orders.
module.exports.wholeFoodsDelivery = page({
  date: 'November 12, 2026',
  orderId: '113-0000000-0000003',
  summary: [['Grand Total:', '$23.10']],
  items: [{ title: 'Organic Bananas', seller: 'Whole Foods Market', price: '$1.10' }],
});

// In-store Whole Foods purchases use a different template (ids, no
// data-component attributes), mirroring a real saved page.
module.exports.wholeFoodsInStore = `<!doctype html><html><body>
  <nav><a href="/whole-foods">Whole Foods</a></nav>
  <div id="od-banner-container">
    <div id="f3_food_ProgressTracker" class="odp-widget-wrapper">
      <div id="progress-tracker">
        <h2 id="ufpo-order-status-primary">Purchased at Whole Foods Market - Castro</h2>
        <span id="ufpo-order-status-secondary">Purchased on Thursday, November 12, 2026</span>
      </div>
    </div>
  </div>
  <div id="f3_food_WfmInStoreOrderSummary" class="odp-widget-wrapper">
    <span>Order #: 113-0000000-0000004</span>
    <table>
      <tr id="wfm-grand-total-row">
        <td><span id="wfm-grand-total-label">Grand Total</span></td>
        <td><span id="wfm-grand-total-amount">$44.14</span></td>
      </tr>
    </table>
  </div>
</body></html>`;

module.exports.notLoaded = `<!doctype html><html><body>
  <nav><a href="/whole-foods">Whole Foods</a></nav>
  <div id="loading"></div>
</body></html>`;

// "View related transactions" page (/cpe/yourpayments/transactions), with
// the structure of a real saved page: a date header, then line items with
// the payment method, amount (negative for a charge) and order link.
function txnRow({ payment = 'Prime Visa ****0000', amount, orderId }) {
  return `
    <div class="a-section a-spacing-base apx-transactions-line-item-component-container">
      <div class="a-row">
        <div class="a-column a-span9"><span class="a-size-base a-text-bold">${payment}</span></div>
        <div class="a-column a-span3 a-text-right a-span-last"><span class="a-size-base-plus a-text-bold">${amount}</span></div>
      </div>
      <div class="a-section"><div class="a-row"><div class="a-column a-span12">
        <a class="a-link-normal" href="https://www.amazon.com/gp/css/summary/edit.html?orderID=${orderId}">Order #${orderId}</a>
      </div></div></div>
      <div class="a-section"><div class="a-row"><div class="a-column a-span12"><span class="a-size-base">Amazon.com</span></div></div></div>
    </div>`;
}

function txnDay(date, rows) {
  return `
    <div class="a-box a-spacing-base"><div class="a-box-inner a-padding-none">
      <div class="a-section a-spacing-base a-padding-base apx-transaction-date-container"><span>${date}</span></div>
      <div class="a-section a-spacing-base">${rows.map(txnRow).join('')}</div>
    </div></div>`;
}

module.exports.transactions = `<!doctype html><html><body>
  <nav><a href="/whole-foods">Whole Foods</a></nav>
  <h3><span>Transactions from Order #112-0000000-0000001</span></h3>
  <form method="post" action="https://www.amazon.com:443/cpe/yourpayments/transactions">
    <div class="a-box-group a-spacing-base">
      <div class="a-box a-box-title apx-transactions-sleeve-header-container"><span class="a-text-bold">Completed</span></div>
      ${txnDay('November 14, 2026', [
        { amount: '$5.00', orderId: '112-0000000-0000001' },
      ])}
      ${txnDay('November 12, 2026', [
        { amount: '-$3.77', orderId: '112-0000000-0000001' },
        { amount: '-$1.00', payment: 'Amazon Gift Card', orderId: '112-0000000-0000001' },
        { amount: '-$99.00', orderId: '111-0000000-0000009' },
      ])}
      ${txnDay('November 10, 2026', [
        { amount: '-$1,005.00', orderId: '112-0000000-0000001' },
      ])}
    </div>
  </form>
</body></html>`;
