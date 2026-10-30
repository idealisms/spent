import * as Dropbox from 'dropbox';
import { CloudState } from '../../main/model';
import { saveTransactionsToDropbox } from '../actions';
import { ITransaction } from '../model';
import { transactionsReducer } from '../reducers';

jest.mock('dropbox', () => {
  const actual = jest.requireActual('dropbox');
  return { ...actual, Dropbox: jest.fn() };
});

function txn(id: string, date: string): ITransaction {
  return {
    id,
    description: id,
    original_line: '',
    date,
    tags: [],
    amount_cents: 100,
    transactions: [],
  };
}

const conflictError = () =>
  new Dropbox.DropboxResponseError(
    409,
    {},
    {
      error_summary: 'path/conflict/file/...',
    },
  );

// A minimal store: just the transactions slice, driven by the real reducer.
function makeStore(transactions: ITransaction[], rev: string) {
  let txState = transactionsReducer(undefined, {
    type: 'RECEIVED_TRANSACTIONS_FROM_DROPBOX',
    transactions,
    rev,
  } as any);
  const getState = () =>
    ({
      auth: { dropboxAccessToken: 'token' },
      transactions: txState,
    }) as any;
  const dispatch = (action: any) => {
    txState = transactionsReducer(txState, action);
  };
  return { getState, dispatch };
}

function mockDropbox(dbx: Partial<Record<string, jest.Mock>>) {
  (Dropbox.Dropbox as unknown as jest.Mock).mockImplementation(() => dbx);
}

function downloadResult(transactions: ITransaction[], rev: string) {
  return {
    result: {
      rev,
      // jsdom's Blob lacks .text(); browsers have it.
      fileBlob: { text: async () => JSON.stringify(transactions) },
    },
  };
}

describe('saveTransactionsToDropbox', () => {
  it('uploads in update mode with the last-seen rev', async () => {
    const filesUpload = jest.fn().mockResolvedValue({ result: { rev: 'r2' } });
    mockDropbox({ filesUpload });
    const store = makeStore([txn('a', '2026-10-01')], 'r1');

    await saveTransactionsToDropbox()(store.dispatch, store.getState, null);

    expect(filesUpload).toHaveBeenCalledTimes(1);
    expect(filesUpload.mock.calls[0][0].mode).toEqual({
      '.tag': 'update',
      update: 'r1',
    });
    expect(store.getState().transactions.rev).toBe('r2');
    expect(store.getState().transactions.cloudState).toBe(CloudState.Done);
  });

  it('on conflict, merges remote additions and keeps local deletions', async () => {
    // Loaded a and b; locally deleted b. Meanwhile fetch-server added c.
    const store = makeStore(
      [txn('a', '2026-10-01'), txn('b', '2026-10-02')],
      'r1',
    );
    store.dispatch({
      type: 'UPDATE_TRANSACTIONS',
      transactions: [txn('a', '2026-10-01')],
    });

    const filesUpload = jest
      .fn()
      .mockRejectedValueOnce(conflictError())
      .mockResolvedValueOnce({ result: { rev: 'r3' } });
    const filesDownload = jest
      .fn()
      .mockResolvedValue(
        downloadResult(
          [
            txn('c', '2026-10-03'),
            txn('b', '2026-10-02'),
            txn('a', '2026-10-01'),
          ],
          'r2',
        ),
      );
    mockDropbox({ filesUpload, filesDownload });

    await saveTransactionsToDropbox()(store.dispatch, store.getState, null);

    expect(filesUpload).toHaveBeenCalledTimes(2);
    expect(filesUpload.mock.calls[1][0].mode).toEqual({
      '.tag': 'update',
      update: 'r2',
    });
    const uploaded = JSON.parse(filesUpload.mock.calls[1][0].contents);
    expect(uploaded.map((t: ITransaction) => t.id)).toEqual(['c', 'a']);

    const state = store.getState().transactions;
    expect(state.transactions.map((t: ITransaction) => t.id)).toEqual([
      'c',
      'a',
    ]);
    expect(state.rev).toBe('r3');
    expect(state.baseIds).toEqual(['c', 'a']);
    expect(state.cloudState).toBe(CloudState.Done);
  });

  it('gives up and stays Modified after repeated conflicts', async () => {
    const store = makeStore([txn('a', '2026-10-01')], 'r1');
    store.dispatch({
      type: 'UPDATE_TRANSACTIONS',
      transactions: [txn('a', '2026-10-01')],
    });
    const filesUpload = jest.fn().mockRejectedValue(conflictError());
    const filesDownload = jest
      .fn()
      .mockResolvedValue(downloadResult([txn('a', '2026-10-01')], 'r2'));
    mockDropbox({ filesUpload, filesDownload });

    await saveTransactionsToDropbox()(store.dispatch, store.getState, null);

    expect(filesUpload).toHaveBeenCalledTimes(3);
    expect(store.getState().transactions.cloudState).toBe(CloudState.Modified);
  });

  it('does not retry on non-conflict errors', async () => {
    const store = makeStore([txn('a', '2026-10-01')], 'r1');
    const filesUpload = jest
      .fn()
      .mockRejectedValue(new Dropbox.DropboxResponseError(401, {}, {}));
    const filesDownload = jest.fn();
    mockDropbox({ filesUpload, filesDownload });

    await saveTransactionsToDropbox()(store.dispatch, store.getState, null);

    expect(filesUpload).toHaveBeenCalledTimes(1);
    expect(filesDownload).not.toHaveBeenCalled();
    expect(store.getState().transactions.cloudState).toBe(CloudState.Modified);
  });
});
