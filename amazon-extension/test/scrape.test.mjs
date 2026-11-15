import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import scrapeModule from '../scrape.js';
import fixtures from './fixtures.js';

const { scrapeOrder, scrapeCharges, transactionsUrl, parseDate, parseCents } = scrapeModule;

const URL = 'https://www.amazon.com/your-orders/order-details?orderID=x';

function scrape(html) {
  return scrapeOrder(new JSDOM(html).window.document, URL);
}

describe('scrapeOrder', () => {
  it('reads a single-item order', () => {
    expect(scrape(fixtures.singleItem)).toEqual({
      order_id: '112-0000000-0000001',
      order_date: '2026-11-10',
      total_cents: 877,
      items: ["MRS. MEYER'S CLEAN DAY Liquid Hand Soap Refill, Honeysuckle, 33 Oz"],
      url: URL,
    });
  });

  it('reads every item, with quantities, and a grand total over $1,000', () => {
    const order = scrape(fixtures.twoItems);
    expect(order.order_date).toBe('2026-06-05');
    expect(order.total_cents).toBe(108575);
    expect(order.items).toEqual([
      '2 x PlanetBox Rover Stainless Steel Bento Box',
      'PlanetBox Shuttle Stainless Shuttle Bento Box',
    ]);
  });

  it('flags in-store Whole Foods purchases', () => {
    expect(scrape(fixtures.wholeFoodsInStore)).toEqual({ whole_foods: true });
  });

  it('treats Whole Foods deliveries as regular orders', () => {
    const order = scrape(fixtures.wholeFoodsDelivery);
    expect(order.whole_foods).toBeUndefined();
    expect(order.total_cents).toBe(2310);
  });

  it('ignores the Whole Foods nav links on every page', () => {
    expect(scrape(fixtures.singleItem).whole_foods).toBeUndefined();
  });

  it('reports what is missing when the order has not rendered', () => {
    expect(scrape(fixtures.notLoaded)).toEqual({
      error: "Couldn't find order id, order date, grand total, items on the page",
    });
  });
});

describe('scrapeCharges', () => {
  const doc = new JSDOM(fixtures.transactions).window.document;

  it("reads this order's card charges, skipping refunds, gift cards and other orders", () => {
    expect(scrapeCharges(doc, '112-0000000-0000001')).toEqual([
      { date: '2026-11-12', amount_cents: 377, payment: 'Prime Visa ****0000' },
      { date: '2026-11-10', amount_cents: 100500, payment: 'Prime Visa ****0000' },
    ]);
  });

  it('returns nothing for an order without charges', () => {
    expect(scrapeCharges(doc, '999-0000000-0000000')).toEqual([]);
  });

  it('builds the transactions URL', () => {
    expect(transactionsUrl('112-0000000-0000001')).toBe(
      'https://www.amazon.com/cpe/yourpayments/transactions?transactionTag=112-0000000-0000001');
  });
});

describe('parsing helpers', () => {
  it('parses dates', () => {
    expect(parseDate('Order placed January 3, 2027')).toBe('2027-01-03');
    expect(parseDate('Smarch 3, 2027')).toBeNull();
  });

  it('parses amounts', () => {
    expect(parseCents('$0.70')).toBe(70);
    expect(parseCents('-$1.42')).toBe(-142);
    expect(parseCents('$12')).toBe(1200);
    expect(parseCents('free')).toBeNull();
  });
});
