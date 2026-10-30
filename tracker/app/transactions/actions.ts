import * as Dropbox from 'dropbox';
import { ThunkAction } from 'redux-thunk';
import { CloudState, IAppState } from '../main/model';
import { ITransaction } from './model';
import { collectIds, mergeRemoteAdditions } from './utils';
import { AuthAction, dropboxDownloadCompleted } from '../auth/actions';
import { AuthStatus } from '../auth/model';
import { DROPBOX_TRANSACTIONS_PATH } from '../dropboxPaths';

// Action types
export enum ActionType {
  REQUEST_TRANSACTIONS_FROM_DROPBOX = 'REQUEST_TRANSACTIONS_FROM_DROPBOX',
  RECEIVED_TRANSACTIONS_FROM_DROPBOX = 'RECEIVED_TRANSACTIONS_FROM_DROPBOX',

  UPDATE_TRANSACTIONS = 'UPDATE_TRANSACTIONS',
  MERGED_REMOTE_TRANSACTIONS = 'MERGED_REMOTE_TRANSACTIONS',
  SAVED_TRANSACTIONS_TO_DROPBOX = 'SAVED_TRANSACTIONS_TO_DROPBOX',

  SET_TRANSACTIONS_CLOUD_STATE = 'SET_TRANSACTIONS_CLOUD_STATE',
}

// Action creators
const receivedTransactionsFromDropbox = (
  transactions?: ITransaction[],
  rev?: string,
) => ({
  type: ActionType.RECEIVED_TRANSACTIONS_FROM_DROPBOX as typeof ActionType.RECEIVED_TRANSACTIONS_FROM_DROPBOX,
  transactions,
  rev,
});

export const updateTransactions = (transactions: ITransaction[]) => ({
  type: ActionType.UPDATE_TRANSACTIONS as typeof ActionType.UPDATE_TRANSACTIONS,
  transactions,
});

const mergedRemoteTransactions = (
  transactions: ITransaction[],
  rev: string,
  baseIds: string[],
) => ({
  type: ActionType.MERGED_REMOTE_TRANSACTIONS as typeof ActionType.MERGED_REMOTE_TRANSACTIONS,
  transactions,
  rev,
  baseIds,
});

const savedTransactionsToDropbox = (rev: string, baseIds: string[]) => ({
  type: ActionType.SAVED_TRANSACTIONS_TO_DROPBOX as typeof ActionType.SAVED_TRANSACTIONS_TO_DROPBOX,
  rev,
  baseIds,
});

const setCloudState = (cloudState: CloudState) => ({
  type: ActionType.SET_TRANSACTIONS_CLOUD_STATE as typeof ActionType.SET_TRANSACTIONS_CLOUD_STATE,
  cloudState,
});

export type TransactionsAction =
  | ReturnType<typeof receivedTransactionsFromDropbox>
  | ReturnType<typeof updateTransactions>
  | ReturnType<typeof mergedRemoteTransactions>
  | ReturnType<typeof savedTransactionsToDropbox>
  | ReturnType<typeof setCloudState>;

// How many times to re-merge and retry a save that conflicts with a
// concurrent write (e.g. fetch-server adding transactions).
const MAX_SAVE_ATTEMPTS = 3;

async function downloadTransactions(
  dbx: Dropbox.Dropbox,
): Promise<{ transactions: ITransaction[]; rev: string }> {
  const response = await dbx.filesDownload({
    path: DROPBOX_TRANSACTIONS_PATH,
  });
  // NOTE: The Dropbox SDK specification does not include a fileBlob
  // field on the FileLinkMetadataReference type, so it is missing from
  // the TypeScript type. This field is injected by the Dropbox SDK.
  const blob: Blob = (response.result as any).fileBlob;
  return {
    transactions: JSON.parse(await blob.text()),
    rev: response.result.rev,
  };
}

// True if a filesUpload in update mode failed because the file's rev no
// longer matches, i.e. someone else wrote it since we last read it.
function isUploadConflict(error: any): boolean {
  return (
    error instanceof Dropbox.DropboxResponseError &&
    error.status === 409 &&
    String((error.error as any)?.error_summary).startsWith('path/conflict')
  );
}

// Async actions
export const fetchTransactionsFromDropboxIfNeeded = (): ThunkAction<
  void,
  IAppState,
  null,
  TransactionsAction | AuthAction
> => {
  return async (dispatch, getState) => {
    const state = getState();
    if (state.transactions.lastUpdated != 0) {
      return;
    }
    let dbx = new Dropbox.Dropbox({
      accessToken: state.auth.dropboxAccessToken,
    });
    const path = DROPBOX_TRANSACTIONS_PATH;
    try {
      const { transactions, rev } = await downloadTransactions(dbx);
      dispatch(receivedTransactionsFromDropbox(transactions, rev));
      dispatch(dropboxDownloadCompleted(path, AuthStatus.OK));
    } catch (error) {
      console.info(`transactions.json download failed, ignoring. ${error}`);
      dispatch(receivedTransactionsFromDropbox());
      dispatch(dropboxDownloadCompleted(path, AuthStatus.NEEDS_LOGIN));
    }
  };
};

export const saveTransactionsToDropbox = (): ThunkAction<
  void,
  IAppState,
  null,
  TransactionsAction
> => {
  return async (dispatch, getState) => {
    const state = getState();
    dispatch(setCloudState(CloudState.Uploading));

    let dbx = new Dropbox.Dropbox({
      accessToken: state.auth.dropboxAccessToken,
    });
    let { transactions, rev, baseIds } = state.transactions;
    try {
      for (let attempt = 1; ; attempt++) {
        try {
          const metadata = await dbx.filesUpload({
            contents: JSON.stringify(transactions),
            path: DROPBOX_TRANSACTIONS_PATH,
            // Only overwrite the version we last saw, so a concurrent
            // write isn't silently clobbered. Without a rev (the initial
            // download failed) fall back to the old overwrite behavior.
            mode: rev
              ? { '.tag': 'update', update: rev }
              : { '.tag': 'overwrite' },
            autorename: false,
            mute: false,
          });
          dispatch(
            savedTransactionsToDropbox(
              metadata.result.rev,
              collectIds(transactions),
            ),
          );
          break;
        } catch (error) {
          if (!isUploadConflict(error) || attempt >= MAX_SAVE_ATTEMPTS) {
            throw error;
          }
          console.info('transactions.json changed remotely; merging.');
          const remote = await downloadTransactions(dbx);
          // Merge into the latest local state, which may have been edited
          // while the upload was in flight.
          transactions = mergeRemoteAdditions(
            getState().transactions.transactions,
            remote.transactions,
            baseIds,
          );
          rev = remote.rev;
          baseIds = collectIds(remote.transactions);
          dispatch(mergedRemoteTransactions(transactions, rev, baseIds));
        }
      }
      dispatch(setCloudState(CloudState.Done));
    } catch (error) {
      console.info(`transactions.json write failed. ${error}`);
      dispatch(setCloudState(CloudState.Modified));
    }
  };
};
