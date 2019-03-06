// import * as React from 'react';
// import {createRenderer, ShallowRenderer} from 'react-test-renderer/shallow';
import * as fs from 'fs';
import moment from 'moment';
import { ITransaction } from '../Model';
import * as utils from '../utils';

describe('Home', () => {
  beforeEach(() => {
    // empty
  });

  afterEach(() => {
    // empty
  });

  it('formatAmount test', () => {
    let t: ITransaction = {
      id: '',
      description: '',
      original_line: '',
      date: '',
      tags: [],
      amount_cents: 0,
      transactions: [],
    };
    expect(utils.formatAmount(t)).toBe('0.00');

    t.amount_cents = 1;
    expect(utils.formatAmount(t)).toBe('0.01');
    t.amount_cents = 9;
    expect(utils.formatAmount(t)).toBe('0.09');

    t.amount_cents = 23;
    expect(utils.formatAmount(t)).toBe('0.23');

    t.amount_cents = 456;
    expect(utils.formatAmount(t)).toBe('4.56');

    t.amount_cents = 7890456;
    expect(utils.formatAmount(t)).toBe('78,904.56');

    t.amount_cents = -78945;
    expect(utils.formatAmount(t)).toBe('(789.45)');

    t.amount_cents = -4;
    expect(utils.formatAmount(t)).toBe('(0.04)');

    t.amount_cents = -75;
    expect(utils.formatAmount(t)).toBe('(0.75)');
  });

  it('generateUUID test', () => {
    expect(utils.generateUUID({getRandomValues: (arr: Uint16Array) => {
      for (let i = 0; i < arr.length; ++i) {
        arr[i] = Math.pow(i + 1, 4);
      }
    }} as Crypto)).toBe('0001001000510100027105100961100019a12710');
  });

  it('filterTransactionsByDate test', () => {
    let transactions = JSON.parse(fs.readFileSync('./app/transactions/__test__/transactions-dates-only.json').toString());
    // March 1 to Apr 30.
    let filtered = utils.filterTransactionsByDate(transactions, new Date(2018, 2, 1), new Date(2018, 3, 30));
    expect(filtered.length).toBe(156 + 140);

    // Oct 1 to the future.
    filtered = utils.filterTransactionsByDate(transactions, new Date(2018, 9, 1), new Date(2050, 0, 1));
    expect(filtered.length).toBe(71);

    // All transactions.
    filtered = utils.filterTransactionsByDate(transactions, new Date(2010, 0, 1), new Date(2050, 0, 1));
    expect(filtered.length).toBe(7991);

    // Single date.
    filtered = utils.filterTransactionsByDate(transactions, new Date(2018, 7, 5), new Date(2018, 7, 5));
    expect(filtered.length).toBe(1);

    // Start date doesn't exist.
    filtered = utils.filterTransactionsByDate(transactions, new Date(2018, 6, 11), new Date(2018, 6, 12));
    expect(filtered.length).toBe(6);

    // End date doesn't exist.
    filtered = utils.filterTransactionsByDate(transactions, new Date(2018, 6, 10), new Date(2018, 6, 11));
    expect(filtered.length).toBe(4);

    // Start and end date don't exist.
    filtered = utils.filterTransactionsByDate(transactions, new Date(2018, 6, 11), new Date(2018, 6, 22));
    expect(filtered.length).toBe(39);

    // No transactions.
    filtered = utils.filterTransactionsByDate(transactions, new Date(2018, 6, 22), new Date(2018, 6, 22));
    expect(filtered.length).toBe(0);

    // Start date is after end date.
    filtered = utils.filterTransactionsByDate(transactions, new Date(2050, 0, 1), new Date(2010, 0, 1));
    expect(filtered.length).toBe(0);
  });

  it('filterTransactions test', () => {
    let transactions = JSON.parse(fs.readFileSync('./app/transactions/__test__/transactions.json').toString());

    // No filters.
    let filtered = utils.filterTransactions(transactions);
    expect(filtered.length).toBe(transactions.length);

    filtered = utils.filterTransactions(
        transactions, moment('2019-01-03').toDate());
    expect(filtered.length).toBe(6);

    filtered = utils.filterTransactions(
        transactions, undefined, moment('2019-01-04').toDate());
    expect(filtered.length).toBe(8);

    filtered = utils.filterTransactions(
        transactions, undefined, undefined, ['aaa']);
    expect(filtered.length).toBe(5);
    filtered = utils.filterTransactions(
        transactions, undefined, undefined, ['aaa', 'bbb']);
    expect(filtered.length).toBe(2);

    filtered = utils.filterTransactions(
        transactions, undefined, undefined, undefined, ['bbb']);
    expect(filtered.length).toBe(6);
    filtered = utils.filterTransactions(
        transactions, undefined, undefined, undefined, ['bbb', 'aaa']);
    expect(filtered.length).toBe(3);

    filtered = utils.filterTransactions(
        transactions, undefined, undefined, undefined, undefined, 'a');
    expect(filtered.length).toBe(10);
    filtered = utils.filterTransactions(
        transactions, undefined, undefined, undefined, undefined, 'notfound');
    expect(filtered.length).toBe(0);
    filtered = utils.filterTransactions(
        transactions, undefined, undefined, undefined, undefined, 'note 1');
    expect(filtered.length).toBe(2);
    filtered = utils.filterTransactions(
        transactions, undefined, undefined, undefined, undefined, 'note  aaa');
    expect(filtered.length).toBe(1);
    filtered = utils.filterTransactions(
        transactions, undefined, undefined, undefined, undefined, '1 2');
    expect(filtered.length).toBe(0);
    filtered = utils.filterTransactions(
        transactions, undefined, undefined, undefined, undefined, 'aaa');
    expect(filtered.length).toBe(1);

    filtered = utils.filterTransactions(
        transactions,
        moment('2019-01-02').toDate(),
        moment('2019-01-04').toDate(),
        ['aaa'],
        ['bbb'],
        'note');
    expect(filtered.length).toBe(2);
    filtered = utils.filterTransactions(
        transactions,
        moment('2019-01-02').toDate(),
        moment('2019-01-04').toDate(),
        ['aaa'],
        ['bbb'],
        'aae');
    expect(filtered.length).toBe(1);
  });
});
