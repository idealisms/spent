// import * as React from 'react';
// import {createRenderer, ShallowRenderer} from 'react-test-renderer/shallow';
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
});
