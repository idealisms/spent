import {
  DROPBOX_SETTINGS_PATH,
  DROPBOX_TRANSACTIONS_PATH,
} from '../app/dropboxPaths';
import { DEFAULT_CATEGORIES } from '../app/transactions/model';

/** Minimal valid settings.json — enough for the app to reach AuthStatus.OK. */
export const MOCK_SETTINGS = {
  version: 2,
  reportCategories: {},
  spendTargets: [],
  dailySpendTarget: {
    startBalanceCents: 0,
    targets: [],
    tags: { include: [], exclude: [] },
  },
  // A downloaded settings.json fully replaces redux state, including this
  // field (unlike the app's own default state, it isn't backfilled), and
  // some components read it unguarded.
  categories: DEFAULT_CATEGORIES,
};

/**
 * Mock transactions, sorted newest-first as the app expects.
 * The Editor page's default date range spans the oldest to newest
 * transaction, so these show up regardless of what day the test runs.
 */
export const MOCK_TRANSACTIONS = [
  {
    id: 'e2e-1',
    description: 'E2E MOCK WHOLE FOODS',
    date: '2026-04-27',
    amount_cents: 4523,
    tags: ['groceries'],
    notes: '',
    source: 'e2e-mock',
    original_line: 'E2E MOCK WHOLE FOODS',
    transactions: [],
  },
  {
    id: 'e2e-2',
    description: 'E2E MOCK PAYCHECK',
    date: '2026-04-01',
    amount_cents: -250000,
    tags: ['income'],
    notes: '',
    source: 'e2e-mock',
    original_line: 'E2E MOCK PAYCHECK',
    transactions: [],
  },
];

export const MOCK_DROPBOX_FILES = [
  {
    path: DROPBOX_TRANSACTIONS_PATH,
    contents: JSON.stringify(MOCK_TRANSACTIONS),
  },
  { path: DROPBOX_SETTINGS_PATH, contents: JSON.stringify(MOCK_SETTINGS) },
];
